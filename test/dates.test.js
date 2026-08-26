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
    const shortcodes = {};

    registerDateTransforms({
        addNunjucksFilter(name, filter) {
            filters[name] = filter;
        },
        addShortcode(name, shortcode) {
            shortcodes[name] = shortcode;
        }
    });

    return { filters, shortcodes };
};

const renderAll = (filters, value) => ({
    isoDate: filters.isoDate(value),
    isoDateTime: filters.isoDateTime(value),
    readableDate: filters.readableDate(value),
    rssDate: filters.rssDate(value)
});

if (process.env.EMP_DATE_TEST_FIXTURE === "1") {
    siteconfig.lang = process.env.EMP_DATE_TEST_LANGUAGE ?? "en";
    const { filters, shortcodes } = registerTransforms();
    const inputs = {
        ...documentedInputs,
        dateObject: new Date("2025-05-23T00:00:00.000Z"),
        millisecondDateObject: new Date("2025-05-23T12:34:56.789Z"),
        winterDateObject: new Date("2025-01-15T12:00:00.000Z"),
        summerDateObject: new Date("2025-07-15T12:00:00.000Z"),
        negativeYearDateObject: new Date("-000001-01-02T03:04:05.006Z"),
        extendedYearDateObject: new Date("+010000-01-02T03:04:05.006Z"),
        overflowDate: "2025-02-30"
    };
    const transforms = Object.fromEntries(
        Object.entries(inputs).map(([name, value]) => [name, renderAll(filters, value)])
    );
    const errorName = (callback) => {
        try {
            callback();
            return null;
        } catch (error) {
            return error.constructor.name;
        }
    };

    process.stdout.write(JSON.stringify({
        transforms,
        errors: {
            isoDate: errorName(() => filters.isoDate("not-a-date")),
            isoDateTime: errorName(() => filters.isoDateTime(new Date(Number.NaN))),
            readableDate: errorName(() => filters.readableDate(undefined)),
            rssDate: errorName(() => filters.rssDate("not-a-date"))
        },
        year: shortcodes.year()
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

    test("Eleventy-normalized Date objects follow the build host timezone", () => {
        for (const [timezone, expectedInputs] of Object.entries(expectedByTimezone)) {
            assert.deepEqual(renderFixture(timezone).transforms.dateObject, expectedInputs.dateOnly, timezone);
        }
    });

    test("explicit source offsets preserve the instant but not the original offset", () => {
        for (const timezone of Object.keys(expectedByTimezone)) {
            const { transforms } = renderFixture(timezone);
            for (const name of ["positiveOffsetDateTime", "negativeOffsetDateTime"]) {
                assert.equal(Date.parse(transforms[name].isoDateTime), Date.parse(documentedInputs[name]), `${timezone}: ${name}`);
            }
        }
    });

    test("timezone-less datetime strings are interpreted in the build host timezone", () => {
        const expectedInstants = {
            UTC: "2025-05-23T12:34:56.000Z",
            "Europe/Riga": "2025-05-23T09:34:56.000Z",
            "America/Los_Angeles": "2025-05-23T19:34:56.000Z"
        };

        for (const [timezone, expectedInstant] of Object.entries(expectedInstants)) {
            const output = renderFixture(timezone).transforms.localDateTime.isoDateTime;
            assert.equal(new Date(output).toISOString(), expectedInstant, timezone);
        }
    });

    test("date-only values roll back a calendar day west of UTC", () => {
        const output = renderFixture("America/Los_Angeles").transforms.dateOnly;
        assert.equal(output.isoDate, "2025-05-22");
        assert.equal(output.readableDate, "May 22, 2025");
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

    test("extended ISO years preserve Luxon's ISO and RSS representations", () => {
        const { negativeYearDateObject, extendedYearDateObject } = renderFixture("UTC").transforms;
        assert.deepEqual(
            [negativeYearDateObject.isoDate, negativeYearDateObject.isoDateTime, negativeYearDateObject.rssDate],
            ["-000001-01-02", "-000001-01-02T03:04:05.006+00:00", "Sat, 02 Jan -0001 03:04:05 +0000"]
        );
        assert.deepEqual(
            [extendedYearDateObject.isoDate, extendedYearDateObject.isoDateTime, extendedYearDateObject.rssDate],
            ["+010000-01-02", "+010000-01-02T03:04:05.006+00:00", "Sun, 02 Jan 10000 03:04:05 +0000"]
        );
    });

    test("readable dates use English and Latvian locale output", () => {
        const expected = {
            UTC: ["May 23, 2025", "2025. g. 23. maijs"],
            "Europe/Riga": ["May 23, 2025", "2025. g. 23. maijs"],
            "America/Los_Angeles": ["May 22, 2025", "2025. g. 22. maijs"]
        };

        for (const [timezone, [english, latvian]] of Object.entries(expected)) {
            assert.equal(renderFixture(timezone, "en").transforms.dateOnly.readableDate, english, `${timezone}: English`);
            assert.equal(renderFixture(timezone, "lv").transforms.dateOnly.readableDate, latvian, `${timezone}: Latvian`);
        }
    });

    test("missing language configuration falls back to English", () => {
        assert.equal(renderFixture("UTC", "").transforms.dateOnly.readableDate, "May 23, 2025");
    });

    test("invalid values throw RangeError in every transform", () => {
        assert.deepEqual(renderFixture("UTC").errors, {
            isoDate: "RangeError",
            isoDateTime: "RangeError",
            readableDate: "RangeError",
            rssDate: "RangeError"
        });
    });

    test("overflow calendar dates are normalized rather than rejected", () => {
        const expected = {
            UTC: {
                isoDate: "2025-03-02",
                isoDateTime: "2025-03-02T00:00:00.000+00:00",
                readableDate: "Mar 2, 2025",
                rssDate: "Sun, 02 Mar 2025 00:00:00 +0000"
            },
            "Europe/Riga": {
                isoDate: "2025-03-02",
                isoDateTime: "2025-03-02T02:00:00.000+02:00",
                readableDate: "Mar 2, 2025",
                rssDate: "Sun, 02 Mar 2025 02:00:00 +0200"
            },
            "America/Los_Angeles": {
                isoDate: "2025-03-01",
                isoDateTime: "2025-03-01T16:00:00.000-08:00",
                readableDate: "Mar 1, 2025",
                rssDate: "Sat, 01 Mar 2025 16:00:00 -0800"
            }
        };

        for (const [timezone, output] of Object.entries(expected)) {
            assert.deepEqual(renderFixture(timezone).transforms.overflowDate, output, timezone);
        }
    });

    test("year shortcode returns the host's current calendar year", () => {
        const before = new Date().getUTCFullYear();
        const actual = renderFixture("UTC").year;
        const after = new Date().getUTCFullYear();
        assert.ok(actual === before || actual === after);
    });
}
