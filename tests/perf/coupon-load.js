import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate } from "k6/metrics";

// Load test for the read-heavy public surface + the coupon preview API,
// which is the hottest server endpoint during a cart session.
// Run: k6 run tests/perf/coupon-load.js   (BASE_URL defaults to localhost)
const BASE = __ENV.BASE_URL || "http://localhost:3000";
const badCoupon = new Rate("coupon_unexpected_errors");

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      exec: "browse",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 20 },
        { duration: "20s", target: 0 },
      ],
    },
    coupon: {
      executor: "constant-arrival-rate",
      exec: "coupon",
      rate: 25,
      timeUnit: "1s",
      duration: "1m30s",
      preAllocatedVUs: 20,
      maxVUs: 60,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
    coupon_unexpected_errors: ["rate<0.01"],
  },
};

export function browse() {
  group("storefront", () => {
    const home = http.get(`${BASE}/`);
    check(home, { "home 200": (r) => r.status === 200 });
    const sticks = http.get(`${BASE}/sticks`);
    check(sticks, { "sticks 200": (r) => r.status === 200 });
  });
  sleep(1);
}

export function coupon() {
  const res = http.post(
    `${BASE}/api/coupon`,
    JSON.stringify({ code: "LOADTEST", subtotalCents: 12900 }),
    { headers: { "Content-Type": "application/json" } }
  );
  // 200 (valid) or 400 (unknown code) are both "healthy"; 5xx is not.
  const healthy = res.status === 200 || res.status === 400;
  check(res, { "coupon endpoint healthy": () => healthy });
  badCoupon.add(!healthy);
}
