import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import registerDateTransforms from "../_11ty/dates.js";
import siteconfig from "../content/_data/siteconfig.js";

const registerTransforms = () => {
    const filters = {};
    registerDateTransforms({
        addNunjucksFilter(name, filter) {
            filters[name] = filter;
        },
        addShortcode() {}
    });
    return filters;
};

if (process.env.EMP_DATE_TEST_FIXTURE === "1") {
    siteconfig.lang = process.env.EMP_DATE_TEST_LANGUAGE ?? "en";
    const filters = registerTransforms();
    const inputs = {
        dateOnly: "2025-05-23",
        localDateTime: "2025-05-23 12:34:56",
        localIsoDateTime: "2025-05-23T12:34:56.789",
        positiveOffsetDateTime: "2025-05-23 12:34:56 +0300",
        negativeOffsetDateTime: "2025-05-23 12:34:56 -0700",
        dateObject: new Date("2025-05-23T00:00:00.000Z"),
        millisecondDateObject: new Date("2025-05-23T12:34:56.789Z")
    };
    process.stdout.write(JSON.stringify(Object.fromEntries(
        Object.entries(inputs).map(([name, value]) => [name, {
            isoDate: filters.isoDate(value),
            isoDateTime: filters.isoDateTime(value),
            readableDate: filters.readableDate(value),
            readableDateTime: filters.readableDateTime(value),
            rssDate: filters.rssDate(value)
        }])
    )));
} else {
    const fixtureCache = new Map();
    const renderFixture = (timezone, language = "en") => {
        const cacheKey = JSON.stringify([timezone, language]);
        if (!fixtureCache.has(cacheKey)) {
            fixtureCache.set(cacheKey, JSON.parse(execFileSync(
                process.execPath,
                [fileURLToPath(import.meta.url)],
                {
                    encoding: "utf8",
                    env: {
                        ...process.env,
                        TZ: timezone,
                        EMP_DATE_TEST_FIXTURE: "1",
                        EMP_DATE_TEST_LANGUAGE: language
                    }
                }
            )));
        }
        return fixtureCache.get(cacheKey);
    };

    test("machine dates default to UTC while preserving explicit offsets and Date objects", () => {
        const expected = {
            dateOnly: "2025-05-23T00:00:00Z",
            localDateTime: "2025-05-23T12:34:56Z",
            localIsoDateTime: "2025-05-23T12:34:56.789Z",
            positiveOffsetDateTime: "2025-05-23T09:34:56Z",
            negativeOffsetDateTime: "2025-05-23T19:34:56Z",
            dateObject: "2025-05-23T00:00:00Z",
            millisecondDateObject: "2025-05-23T12:34:56.789Z"
        };
        for (const timezone of ["UTC", "Europe/Riga", "America/Los_Angeles"]) {
            const actual = renderFixture(timezone);
            for (const [name, instant] of Object.entries(expected)) {
                const milliseconds = Date.parse(instant);
                assert.match(actual[name].isoDateTime, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/);
                assert.match(actual[name].rssDate, /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
                assert.equal(Date.parse(actual[name].isoDateTime), milliseconds, `${timezone}: ${name}`);
                assert.equal(Date.parse(actual[name].rssDate), Math.floor(milliseconds / 1000) * 1000, `${timezone}: ${name}`);
            }
        }
    });

    test("sitemap and readable dates use UTC while retaining the locale", () => {
        for (const timezone of ["UTC", "Europe/Riga", "America/Los_Angeles"]) {
            const actual = renderFixture(timezone).dateOnly;
            assert.equal(actual.isoDate, "2025-05-23", timezone);
            assert.equal(actual.readableDate, "May 23, 2025", timezone);
            assert.equal(actual.readableDateTime, "May 23, 2025, 00:00", timezone);
            assert.equal(renderFixture(timezone, "lv").dateOnly.readableDate, "2025. g. 23. maijs", timezone);
        }
    });

    test("latest modified date prefers updates and ignores collection order", () => {
        const filters = registerTransforms();
        const latest = filters.latestModifiedDate([
            { date: "2025-05-23 12:34:56 +0300", data: {} },
            { date: "2025-05-24 12:34:56 +0300", data: { updated: "2025-06-01 12:34:56 -0700" } },
            { date: "2025-05-25 12:34:56 +0300", data: {} }
        ]);
        assert.equal(latest.toISOString(), "2025-06-01T19:34:56.000Z");
    });

    test("latest modified date leaves empty collections undated", () => {
        const filters = registerTransforms();
        assert.equal(filters.latestModifiedDate([]), undefined);
    });
}
