import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import registerDateTransforms from "../_11ty/dates.js";
import siteconfig from "../content/_data/siteconfig.js";

const documentedInputs = {
    dateOnly: "2025-05-23",
    localDateTime: "2025-05-23 12:34:56",
    positiveOffsetDateTime: "2025-05-23 12:34:56 +0300",
    negativeOffsetDateTime: "2025-05-23 12:34:56 -0700"
};

const registerTransforms = () => {
    const filters = {};

    registerDateTransforms({
        addNunjucksFilter(name, filter) {
            filters[name] = filter;
        },
        addShortcode() {}
    });

    return { filters };
};

const renderAll = (filters, value) => ({
    isoDate: filters.isoDate(value),
    isoDateTime: filters.isoDateTime(value),
    readableDate: filters.readableDate(value),
    rssDate: filters.rssDate(value)
});

if (process.env.EMP_DATE_TEST_FIXTURE === "1") {
    siteconfig.lang = process.env.EMP_DATE_TEST_LANGUAGE ?? "en";
    const { filters } = registerTransforms();
    const inputs = {
        ...documentedInputs,
        dateObject: new Date("2025-05-23T00:00:00.000Z"),
        millisecondDateObject: new Date("2025-05-23T12:34:56.789Z"),
        winterDateObject: new Date("2025-01-15T12:00:00.000Z"),
        summerDateObject: new Date("2025-07-15T12:00:00.000Z")
    };
    const transforms = Object.fromEntries(
        Object.entries(inputs).map(([name, value]) => [name, renderAll(filters, value)])
    );
    const latestModifiedDate = filters.latestModifiedDate([
        { date: "2025-05-23 12:34:56 +0300", data: {} },
        { date: "2025-05-24 12:34:56 +0300", data: { updated: "2025-06-01 12:34:56 -0700" } },
        { date: "2025-05-25 12:34:56 +0300", data: {} }
    ]);

    process.stdout.write(JSON.stringify({
        transforms,
        latestModifiedDate: latestModifiedDate.toISOString()
    }));
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

    const expectedByTimezone = {
        UTC: {
            dateOnly: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T00:00:00.000+00:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 00:00:00 +0000"
            },
            localDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T12:34:56.000+00:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 12:34:56 +0000"
            },
            positiveOffsetDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T09:34:56.000+00:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 09:34:56 +0000"
            },
            negativeOffsetDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T19:34:56.000+00:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 19:34:56 +0000"
            }
        },
        "Europe/Riga": {
            dateOnly: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T03:00:00.000+03:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 03:00:00 +0300"
            },
            localDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T12:34:56.000+03:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 12:34:56 +0300"
            },
            positiveOffsetDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T12:34:56.000+03:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 12:34:56 +0300"
            },
            negativeOffsetDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T22:34:56.000+03:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 22:34:56 +0300"
            }
        },
        "America/Los_Angeles": {
            dateOnly: {
                isoDate: "2025-05-22",
                isoDateTime: "2025-05-22T17:00:00.000-07:00",
                readableDate: "May 22, 2025",
                rssDate: "Thu, 22 May 2025 17:00:00 -0700"
            },
            localDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T12:34:56.000-07:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 12:34:56 -0700"
            },
            positiveOffsetDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T02:34:56.000-07:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 02:34:56 -0700"
            },
            negativeOffsetDateTime: {
                isoDate: "2025-05-23",
                isoDateTime: "2025-05-23T12:34:56.000-07:00",
                readableDate: "May 23, 2025",
                rssDate: "Fri, 23 May 2025 12:34:56 -0700"
            }
        }
    };

    for (const [timezone, expectedInputs] of Object.entries(expectedByTimezone)) {
        test(`all documented front-matter formats in ${timezone}`, () => {
            const { transforms } = renderFixture(timezone);
            for (const name of Object.keys(documentedInputs)) {
                assert.deepEqual(transforms[name], expectedInputs[name], name);
            }
        });
    }

    test("Date objects are formatted in the build host timezone", () => {
        for (const [timezone, expectedInputs] of Object.entries(expectedByTimezone)) {
            assert.deepEqual(renderFixture(timezone).transforms.dateObject, expectedInputs.dateOnly, timezone);
        }
    });

    test("build-host daylight-saving offsets are reflected in machine formats", () => {
        const expected = {
            UTC: ["2025-01-15T12:00:00.000+00:00", "2025-07-15T12:00:00.000+00:00"],
            "Europe/Riga": ["2025-01-15T14:00:00.000+02:00", "2025-07-15T15:00:00.000+03:00"],
            "America/Los_Angeles": ["2025-01-15T04:00:00.000-08:00", "2025-07-15T05:00:00.000-07:00"]
        };

        for (const [timezone, outputs] of Object.entries(expected)) {
            const { transforms } = renderFixture(timezone);
            const actual = [
                transforms.winterDateObject.isoDateTime,
                transforms.summerDateObject.isoDateTime
            ];
            assert.deepEqual(actual, outputs, timezone);
        }
    });

    test("full ISO output preserves milliseconds while RSS output drops them", () => {
        const output = renderFixture("UTC").transforms.millisecondDateObject;
        assert.equal(output.isoDateTime, "2025-05-23T12:34:56.789+00:00");
        assert.equal(output.rssDate, "Fri, 23 May 2025 12:34:56 +0000");
    });

    test("readable dates use the configured Latvian locale", () => {
        const expected = {
            UTC: "2025. g. 23. maijs",
            "Europe/Riga": "2025. g. 23. maijs",
            "America/Los_Angeles": "2025. g. 22. maijs"
        };

        for (const [timezone, output] of Object.entries(expected)) {
            assert.equal(renderFixture(timezone, "lv").transforms.dateOnly.readableDate, output, timezone);
        }
    });

    test("latest modified date prefers updates and ignores collection order", () => {
        for (const timezone of Object.keys(expectedByTimezone)) {
            assert.equal(renderFixture(timezone).latestModifiedDate, "2025-06-01T19:34:56.000Z", timezone);
        }
    });

    test("latest modified date leaves empty collections undated", () => {
        const { filters } = registerTransforms();
        assert.equal(filters.latestModifiedDate([]), undefined);
    });
}