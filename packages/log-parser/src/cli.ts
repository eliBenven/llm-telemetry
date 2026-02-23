#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { parseNginxLog } from "./parsers/nginx";
import { parseCloudFrontLog } from "./parsers/cloudfront";
import { classifyUserAgent } from "./classifier";
import { aggregate, toCSV, toJSON } from "./aggregator";
import type { ClassifiedLogEntry } from "./aggregator";

const program = new Command();

program
  .name("llm-log-parser")
  .description("Parse server/CDN logs to measure AI crawler/bot traffic")
  .version("0.1.0");

program
  .command("parse")
  .description("Parse a log file and output AI bot traffic aggregates")
  .argument("<logfile>", "Path to the log file")
  .option("-f, --format <format>", "Log format: nginx | cloudfront", "nginx")
  .option(
    "-o, --output <format>",
    "Output format: json | csv",
    "json"
  )
  .option("--out-file <path>", "Write output to file instead of stdout")
  .option("--bots-only", "Only include bot traffic (exclude human rows)", false)
  .action(
    (
      logfile: string,
      opts: {
        format: string;
        output: string;
        outFile?: string;
        botsOnly: boolean;
      }
    ) => {
      const content = readFileSync(logfile, "utf-8");

      let classified: ClassifiedLogEntry[];

      if (opts.format === "nginx") {
        const entries = parseNginxLog(content);
        classified = entries.map((e) => {
          const cls = classifyUserAgent(e.userAgent);
          return {
            timestamp: e.timestamp,
            path: e.path,
            status: e.status,
            bodyBytes: e.bodyBytes,
            isBot: cls.isBot,
            botName: cls.botName,
          };
        });
      } else if (opts.format === "cloudfront") {
        const entries = parseCloudFrontLog(content);
        classified = entries.map((e) => {
          const cls = classifyUserAgent(e.userAgent);
          return {
            timestamp: e.date,
            path: e.path,
            status: e.status,
            bodyBytes: e.scBytes,
            isBot: cls.isBot,
            botName: cls.botName,
          };
        });
      } else {
        console.error(`Unknown format: ${opts.format}`);
        process.exit(1);
      }

      if (opts.botsOnly) {
        classified = classified.filter((e) => e.isBot);
      }

      const rows = aggregate(classified);

      let result: string;
      if (opts.output === "csv") {
        result = toCSV(rows);
      } else {
        result = toJSON(rows);
      }

      if (opts.outFile) {
        writeFileSync(opts.outFile, result, "utf-8");
        console.error(`Written to ${opts.outFile}`);
      } else {
        console.log(result);
      }
    }
  );

program.parse();
