import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetAllStores } from "./src/test-utils/resetStores";

afterEach(() => {
  cleanup();
  resetAllStores();
});
