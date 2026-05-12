import { afterAll, beforeAll } from "vitest";

// 测试会话标记，用于隔离测试数据
export const TEST_SESSION_KEY = `open-upsp-test-${Date.now()}`;

beforeAll(() => {
  process.env.OPEN_UPSP_TEST_MODE = "true";
  process.env.OPEN_UPSP_TEST_SESSION_KEY = TEST_SESSION_KEY;
});

afterAll(() => {});
