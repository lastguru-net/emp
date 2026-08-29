---
title: "Text and Typography"
date: "2025-04-19"
image: /images/sample.png
tags:
- article
- text
- typography
author: "lastguru"
excerpt: "Examples of text, typography, lists, tables, pictures, videos, and more."
---

## Headings

# H1 - heading

## H2 - heading

### H3 - heading

#### H4 - heading

## Paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## Emphasis

Italic *text*

Bold **text**

Bold italic ***text***

Strikethrough ~~text~~

Highlighted ==text==

Subscript: H~2~O

Superscript: X^2^

Inline code: `So much code`.

## Links

Just link: <http://127.0.0.1>

Just email: <fake@example.com>

Text link: [Dmitrijs Golubevs](https://lastguru.lv/)

## Special symbols

Some common special characters can be typed with ease, like: (c) (r) (tm) +- ... -- ---

Plenty of emojis are available, like: :warning: :bulb: :satellite: :smile: :tent: :joy: :heartpulse:

## Lists

### Ordered list

1. Firstly
2. Secondly
3. Thirdly

### Unordered list

- Chapter
  - Section 1
  - Section 2

### ToDo list

- [ ] Job
  - [x] Step 1
  - [x] Step 2
  - [ ] Step 3

### Description list

Sun
: the star around which the Earth orbits

Moon
: the natural satellite of the Earth, visible by reflected light from the Sun

## Block Quote

> This line shows the *block quote*.
> The quote may contain multiple lines or even paragraphs

### Admonitions

> :warning: **Warning:** Do not push the big red button.

> :memo: **Note:** Sunrises are beautiful.

> :bulb: **Tip:** Remember to appreciate the little things in life.

## Tables

| Company                      | Contact           | Country |
| :--------------------------- | :---------------: | ------: |
| Alfreds Futterkiste          | Maria Anders      | Germany |
| Island Trading               | Helen Bennett     |      UK |
| Magazzini Alimentari Riuniti | Giovanni Rovelli  |   Italy |

*Table 1: a sample table. Note that you can align text in the columns to the left, right or center.*

## Footnote

Clicking the hook will locate the footnote[^footnote], and here is another footnote[^fn-nth-2].

## Code blocks

Every fenced code block includes a one-line header based on its language. Add `filename="..."` or `title="..."` after the language identifier to show more context alongside the language. If both fields are supplied, `title` takes precedence over `filename`. Long titles preserve their beginning and use a trailing ellipsis; long filenames preserve their end and use a leading ellipsis.

### Common

```text
This is a common code snippet, without syntax highlight and line numbers.
```

### Specific Language

```bash filename="status-check.sh"
if [ $? -ne 0 ]; then
  echo "The command was not successful.";
  #do the needful / exit
fi;
```

### Raw HTML

Raw HTML can be written directly in Markdown. This example first shows the source in a code block with a custom title:

```html title="Expandable raw HTML"
<details>
  <summary>Show raw HTML content</summary>
  <p>This content is rendered directly from HTML.</p>
</details>
```

The same markup rendered as raw HTML:

<details>
  <summary>Show raw HTML content</summary>
  <p>This content is rendered directly from HTML.</p>
</details>

## Images

### Default

![Sample image](/images/sample.png)
*Image 1: Sample image*

### Linking images

[![Sample image](/images/sample.png)](https://lastguru.lv/)
*Image 2: Sample image with a link*

## Embeds

The following services can be embedded:

- Instagram
- OpenStreetMap
- Spotify
- TED
- TikTok
- Twitch
- Twitter
- Vimeo
- YouTube

Example:

https://www.youtube.com/watch?v=dQw4w9WgXcQ

## Reverse Footnote

[^footnote]: The footnote source
[^fn-nth-2]: The 2nd footnote source
