#!/usr/bin/env node

import { runProxy } from "./proxy";

if (require.main === module) {
  runProxy();
}

