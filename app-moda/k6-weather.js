// k6-weather.js
// Load test for /api/weather
// Usage: k6 run k6-weather.js
//        k6 run k6-weather.js --vus 20 --duration 60s

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    weather: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },   // Warm up
        { duration: '1m', target: 20 },   // Normal load (weather is cheap)
        { duration: '30s', target: 50 },  // Stress
        { duration: '30s', target: 0 },   // Cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(50)<500', 'p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Madrid coordinates (varied slightly to test cache)
const COORDS = [
  { lat: 40.4168, lon: -3.7038 },  // Madrid
  { lat: 40.42, lon: -3.71 },
  { lat: 40.41, lon: -3.69 },
  { lat: 41.3851, lon: 2.1734 },   // Barcelona
  { lat: 37.3891, lon: -5.9845 },  // Sevilla
];

export default function () {
  const coord = COORDS[Math.floor(Math.random() * COORDS.length)];
  const url = `${BASE_URL}/api/weather?lat=${coord.lat}&lon=${coord.lon}`;
  
  const res = http.get(url, { timeout: '10s' });
  
  const success = check(res, {
    'status 200': (r) => r.status === 200,
    'has temperature': (r) => {
      try { 
        const body = JSON.parse(r.body); 
        return typeof body.temperatureC === 'number'; 
      } catch { return false; }
    },
    'response time < 2s': (r) => r.timings.duration < 2000,
    'cache headers present': (r) => r.headers['Cache-Control'] !== undefined,
  });

  errorRate.add(!success);
  sleep(0.5); // Weather can handle higher rate
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary-weather.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options || {};
  const c = enableColors ? {
    green: '\u001b[32m', red: '\u001b[31m', yellow: '\u001b[33m', 
    blue: '\u001b[34m', reset: '\u001b[0m', bold: '\u001b[1m'
  } : { green: '', red: '', yellow: '', blue: '', reset: '', bold: '' };
  
  let out = '\n' + c.bold + '=== k6 WEATHER LOAD TEST SUMMARY ===' + c.reset + '\n\n';
  
  const http = data.metrics.http_req_duration;
  if (http) {
    out += `${c.blue}Latency (ms):${c.reset}\n`;
    out += `${indent}p50: ${http.values['p(50)']?.toFixed(0) || 'N/A'}\n`;
    out += `${indent}p95: ${http.values['p(95)']?.toFixed(0) || 'N/A'}\n`;
    out += `${indent}p99: ${http.values['p(99)']?.toFixed(0) || 'N/A'}\n\n`;
  }
  
  const errors = data.metrics.errors;
  if (errors) {
    const rate = (errors.values.rate * 100).toFixed(2);
    const color = rate > 2 ? c.red : c.green;
    out += `${c.blue}Error Rate:${c.reset} ${color}${rate}%${c.reset}\n`;
  }
  
  const httpReqs = data.metrics.http_reqs;
  if (httpReqs) {
    out += `${c.blue}Total Requests:${c.reset} ${httpReqs.values.count}\n`;
    out += `${c.blue}Throughput:${c.reset} ${httpReqs.values.rate?.toFixed(2) || 'N/A'} req/s\n`;
  }
  
  out += `\n${c.blue}Thresholds:${c.reset}\n`;
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const passed = threshold.ok ? `${c.green}✓ PASS${c.reset}` : `${c.red}✗ FAIL${c.reset}`;
    out += `${indent}${name}: ${passed}\n`;
  }
  
  return out;
}