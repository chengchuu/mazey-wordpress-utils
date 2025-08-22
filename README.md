# Mazey WordPress Utils

[![NPM version][npm-image]][npm-url]
[![l][l-image]][l-url]

[npm-image]: https://img.shields.io/npm/v/mazey-wordpress-utils
[npm-url]: https://npmjs.org/package/mazey-wordpress-utils
[l-image]: https://img.shields.io/npm/l/mazey-wordpress-utils
[l-url]: https://github.com/chengchuu/mazey-wordpress-utils

WordPress utilities.

## Install

You can get mazey-wordpress-utils via [npm](https://www.npmjs.com/package/mazey-wordpress-utils).

```bash
npm install mazey-wordpress-utils --save
```

## Usage

### hideSidebar

Hide the sidebar on the webpage.

Example: <https://example.com/home?hide_sidebar>

```javascript
hideSidebar({
  urlContainList: ['hide_sidebar', 'no_sidebar'],
  primarySelector: '#main-content',
  secondarySelector: '#sidebar'
});
```

### hideHeaderInTOC

Hide the header when it meets one of these two conditions:

- Use WordPress Plugin [Easy Table of Contents](https://wordpress.org/plugins/easy-table-of-contents/) and open it in this page.
- The page's URL is matched with one of the `urlContainList`.

Example: <https://example.com/home?hide_header_in_toc>

```javascript
hideHeaderInTOC({
  urlContainList: ['hide_header_in_toc', 'no_header_in_toc'],
  headerSelector: '.site-header'
});
```

### isIncludeInUrl

Check if the current URL includes a specified string.

Example: <https://example.com/home?example>

```javascript
isIncludeInUrl({
  urlContainString: 'example'
});
```

### setImgWidthHeight

Set the width and height of an image based on the parameters specified in the image's URL.

Use jQuery to select all `img` elements on the page and then checks each image's `src` attribute for `width` and `height` parameters. If these parameters are found, the function sets the image's width and height accordingly.

The width and height parameters in the URL should be in the format `width=<value><unit>` and `height=<value><unit>`, where `<value>` is a number and `<unit>` is a CSS unit like `px`, `rem`, or `vw`.

Example 1:
For an image with the URL `<img src="https://example.com/image.png?width=400px&height=200px" alt="file" />`, the function will execute `window.jQuery('img').width('400px')` and `window.jQuery('img').height('200px')`.

Example 2:
For an image with the URL `<img src="https://example.com/image.png?width=400rem&height=20vw" alt="file" />`, the function will execute `window.jQuery('img').width('400rem')` and `window.jQuery('img').height('20vw')`.

## Contributing

```bash
# dev
npm run dev

# build
npm run build
```
