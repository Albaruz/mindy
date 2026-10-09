// k6-recommender.js
// Load test for /api/recommender
// Usage: k6 run k6-recommender.js
//        k6 run k6-recommender.js --vus 10 --duration 60s

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const fallbackRate = new Rate('fallback_rate');

export const options = {
  // Default: smoke test (override with CLI flags)
  scenarios: {
    recommender: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1 },   // Warm up
        { duration: '1m', target: 5 },    // Normal load
        { duration: '30s', target: 10 },  // Stress
        { duration: '30s', target: 0 },   // Cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(50)<3000', 'p(95)<8000', 'p(99)<15000'], // Latency budgets
    http_req_failed: ['rate<0.05'],                                    // <5% errors
    errors: ['rate<0.05'],
    fallback_rate: ['rate<0.3'],                                       // <30% fallbacks (Groq quota)
  },
};

// Base URL - override with: k6 run -e BASE_URL=https://your-app.vercel.app k6-recommender.js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Mock garment payload (matches your schema)
function generateMockGarments(count = 30) {
  const types = ['top', 'bottom', 'footwear', 'outerwear', 'dress'];
  const colors = ['black', 'white', 'blue', 'red', 'beige', 'gray', 'navy', 'green'];
  const materials = ['cotton', 'denim', 'wool', 'polyester', 'linen'];
  const seasons = ['all', 'summer', 'winter', 'mid_season'];
  const styles = ['casual', 'formal', 'sport', 'elegant', 'streetwear', 'party'];
  
  return Array.from({ length: count }, (_, i) => ({
    garmentId: `garment-${i}`,
    garment_type: types[i % types.length],
    color: colors[i % colors.length],
    material: materials[i % materials.length],
    season: seasons[i % seasons.length],
    style: styles[i % styles.length],
    is_dirty: false,
    extra_tags: {},
    cut_length: 'regular',
  }));
}

const MOCK_GARMENTS = generateMockGarments(30);

export default function () {
  const payload = JSON.stringify({
    garments: MOCK_GARMENTS,
    temperatureC: 22,
    condition: 'Clear',
    dayLow: 18,
    dayHigh: 26,
    rainProbability: 10,
    profile: null,
    mood: 'relaxed',
    style: 'casual',
    lockedGarmentIds: [],
    dismissedGarmentIds: [],
  });

  const params = { 
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s', // Match Groq timeout
  };

  const res = http.post(`${BASE_URL}/api/recommender`, payload, params);
  
  const success = check(res, {
    'status 200': (r) => r.status === 200,
    'has options': (r) => {
      try { 
        const body = JSON.parse(r.body); 
        return Array.isArray(body.options) && body.options.length > 0; 
      } catch { return false; }
    },
    'response time < 10s': (r) => r.timings.duration < 10000,
  });

  // Track fallback rate
  try {
    const body = JSON.parse(res.body);
    if (body._isFallback === true) {
      fallbackRate.add(1);
    } else {
      fallbackRate.add(0);
    }
  } catch {
    fallbackRate.add(0);
  }

  errorRate.add(!success);
  
  sleep(1); // Think time between requests
}

// Summary output
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options || {};
  const c = enableColors ? {
    green: '\u001b[32m', red: '\u001b[31m', yellow: '\u001b[33m', 
    blue: '\u001b[34m', reset: '\u001b[0m', bold: '\u001b[1m'
  } : { green: '', red: '', yellow: '', blue: '', reset: '', bold: '' };
  
  let out = '\n' + c.bold + '=== k6 RECOMMENDER LOAD TEST SUMMARY ===' + c.reset + '\n\n';
  
  // HTTP metrics
  const http = data.metrics.http_req_duration;
  if (http) {
    out += `${c.blue}Latency (ms):${c.reset}\n`;
    out += `${indent}p50: ${http.values['p(50)']?.toFixed(0) || 'N/A'}\n`;
    out += `${indent}p95: ${http.values['p(95)']?.toFixed(0) || 'N/A'}\n`;
    out += `${indent}p99: ${http.values['p(99)']?.toFixed(0) || 'N/A'}\n`;
    out += `${indent}max: ${http.values['max']?.toFixed(0) || 'N/A'}\n\n`;
  }
  
  // Error rate
  const errors = data.metrics.errors;
  if (errors) {
    const rate = (errors.values.rate * 100).toFixed(2);
    const color = rate > 5 ? c.red : c.green;
    out += `${c.blue}Error Rate:${c.reset} ${color}${rate}%${c.reset}\n`;
  }
  
  // Fallback rate
  const fallback = data.metrics.fallback_rate;
  if (fallback) {
    const rate = (fallback.values.rate * 100).toFixed(2);
    const color = rate > 30 ? c.yellow : c.green;
    out += `${c.blue}Fallback Rate:${c.reset} ${color}${rate}%${c.reset}\n`;
  }
  
  // Throughput
  const httpReqs = data.metrics.http_reqs;
  if (httpReqs) {
    out += `${c.blue}Total Requests:${c.reset} ${httpReqs.values.count}\n`;
    out += `${c.blue}Throughput:${c.reset} ${httpReqs.values.rate?.toFixed(2) || 'N/A'} req/s\n`;
  }
  
  // Thresholds
  out += `\n${c.blue}Thresholds:${c.reset}\n`;
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const passed = threshold.ok ? `${c.green}✓ PASS${c.reset}` : `${c.red}✗ FAIL${c.reset}`;
    out += `${indent}${name}: ${passed}\n`;
  }
  
  return out;
}