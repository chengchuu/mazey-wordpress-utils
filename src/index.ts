import { throttle, genCustomConsole, isNonEmptyArray } from "mazey";
import copy from "copy-to-clipboard";

const wpCon = genCustomConsole("[Mazey WP Utils]");

const defaultCopyOptions = {
  selector: "",
  ignoredTexts: [],
  separate: "",
};

/**
 * Sets a copy button for all <p> tags within the specified element.
 * 
 * @returns {boolean} True if the copy buttons were successfully set, false otherwise.
 */
export function setCopyBtn(
  options: {
    selector?: string;
    ignoredTexts?: string[];
    separate?: string,
  } = {
    ...defaultCopyOptions,
  }
): boolean {
  let { selector, ignoredTexts, separate } = Object.assign(
    {
      ...defaultCopyOptions,
    },
    options
  );
  if (!selector) {
    wpCon.warn("setCopyBtnForAllTagP: selector is empty, using default value");
    selector = ".entry-content p";
  }
  const allTagP = document.querySelectorAll(selector);
  if (!allTagP || allTagP.length === 0) return false;
  allTagP.forEach(p => {
    let text = "";
    if (separate) {
      const child = p.children;
      if (!child || child.length === 0) return;
      const len = child.length;
      for (let index = 0; index < len; ++index) {
        if (index === 0) {
          text = child[index].innerText;
        } else {
          text += separate + child[index].innerText;
        }
      }
    } else {
      text = p.innerText;
    }
    if (isNonEmptyArray(ignoredTexts) && ignoredTexts.includes(text)) return;
    const btn = document.createElement("button");
    btn.innerText = "Copy";
    btn.classList.add("mazey-wp-btn-copy");
    btn.addEventListener("click", () => {
      copy(text);
      btn.innerText = "Copied";
      setTimeout(() => {
        btn.innerText = "Copy";
      }, 1000);
    });
    p.appendChild(btn);
  });
  return true;
}

/**
 * Alias of "setCopyBtn"
 * The copy button allows users to copy the text content of the <p> tag.
 * 
 * @hidden
 */
export function setCopyBtnForAllTagP(
  options: {
    selector?: string;
    ignoredTexts?: string[];
  } = {
    ...defaultCopyOptions,
  }
): boolean {
  return setCopyBtn(options);
}

/**
 * Set the 'loading' attribute of all images within a specified element to 'lazy', enabling lazy loading. 
 * The function only runs once after the page has loaded.
 * 
 * ```javascript
 * setImgLazyLoadingWhenDomReady('.site-content');
 * ```
 * 
 * @param selector - CSS selector for the element that contains the images. Default is '.site-content'.
 * @returns {boolean} - Returns `true` if the function was able to set the images' lazy loading and it hasn't been run before, `false` otherwise.
 */
export function setImgLazyLoadingWhenDomReady(selector = ".site-content"): boolean {
  function handleLoad () {
    const images = document.querySelectorAll(`${selector} img`);
    if (images.length === 0) return false;
    images.forEach(image => {
      image.setAttribute("loading", "lazy");
    });
    return true;
  }
  return handleLoad();
}

/**
 * The variable that stores whether the header has been hidden.
 */
let loadedHideHeaderInTOC = false;

/**
 * Hide the header when it meets one of these two conditions:
 * 
 * - Use WordPress Plugin [Easy Table of Contents](https://wordpress.org/plugins/easy-table-of-contents/) and open it in this page.
 * - The page's URL is matched with one of the `urlContainList`.
 * 
 * Example: <https://example.com/home?hide_header_in_toc>
 * 
 * ```javascript
 * hideHeaderInTOC({
 *   urlContainList: ['hide_header_in_toc', 'no_header_in_toc'],
 *   headerSelector: '.site-header'
 * });
 * ```
 * 
 * @param options - Configuration options for hiding the header.
 * @param options.urlContainList - List of strings. If the current URL contains any of these strings, the header will be hidden. Default is ['hide_header_in_toc'].
 * @param options.headerSelector - CSS selector for the header. Default is '.site-header'.
 * @returns {boolean} - Returns `true` if the header was successfully hidden, `false` otherwise.
 */
export function hideHeaderInTOC(options = {}): boolean {
  const { urlContainList = [], headerSelector } = Object.assign({
    urlContainList: [ "hide_header_in_toc" ],
    headerSelector: ".site-header",
  }, options);
  let isIncludeUrls = false;
  if (urlContainList.length === 0) {
    isIncludeUrls = true;
  } else {
    isIncludeUrls = urlContainList.some(urlContainString => isIncludeInUrl({ urlContainString }));
  }
  const isEzTocContainerDomExist = document.querySelector("#ez-toc-container");
  const isHideHeader = isIncludeUrls || isEzTocContainerDomExist;
  const SiteHeaderDom = document.querySelector(headerSelector);
  if (!SiteHeaderDom) return false;
  // Handle Event
  function handleScroll () {
    if (!SiteHeaderDom) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    const visibility = SiteHeaderDom.style.visibility;
    if (scrollTop > 100) {
      if (visibility !== "hidden") SiteHeaderDom.style.visibility = "hidden";
    } else {
      if (visibility !== "visible") SiteHeaderDom.style.visibility = "visible";
    }
  }
  if (isHideHeader && SiteHeaderDom && loadedHideHeaderInTOC === false) {
    // Listen
    window.addEventListener("scroll", throttle(handleScroll, 50, { leading: true }));
    // Init when page loaded
    setTimeout(() => {
      handleScroll();
    }, 25);
    loadedHideHeaderInTOC = true;
    return true;
  }
  return false;
}

/**
 * Hide the sidebar on the webpage.
 * 
 * Example: <https://example.com/home?hide_sidebar>
 * 
 * ```javascript
 * hideSidebar({
 *   urlContainList: ['hide_sidebar', 'no_sidebar'],
 *   primarySelector: '#main-content',
 *   secondarySelector: '#sidebar'
 * });
 * ```
 * 
 * @param options - Configuration options for hiding the sidebar.
 * @param options.urlContainList - List of strings. If the current URL contains any of these strings, the sidebar will be hidden. Default is ['hide_sidebar'].
 * @param options.primarySelector - CSS selector for the primary content area. Default is '#primary'.
 * @param options.secondarySelector - CSS selector for the sidebar. Default is '#secondary'.
 * @returns {boolean} - Returns `true` if the sidebar was successfully hidden, `false` otherwise.
 */
export function hideSidebar(options = {}): boolean {
  const { urlContainList = [], primarySelector, secondarySelector } = Object.assign({
    urlContainList: [ "hide_sidebar" ],
    primarySelector: "#primary",
    secondarySelector: "#secondary",
  }, options);
  const isHideSidebar = urlContainList.some(urlContainString => isIncludeInUrl({ urlContainString }));
  const secondaryDom = document.querySelector(secondarySelector);
  if (!secondaryDom) return false;
  const primaryDom = document.querySelector(primarySelector);
  if (!primaryDom) return false;
  if (isHideSidebar && secondaryDom && primaryDom) {
    secondaryDom.style.display = "none";
    primaryDom.style.width = "100%";
    return true;
  }
  return false;
}

/**
 * Check if the current URL includes a specified string.
 * 
 * Example: <https://example.com/home?example>
 * 
 * ```javascript
 * isIncludeInUrl({
 *   urlContainString: 'example'
 * });
 * ```
 * 
 * @param options.urlContainString - The string to check for in the URL. Default is an empty string.
 * @returns {boolean} - Returns `true` if the URL contains the specified string, `false` otherwise.
 */
export function isIncludeInUrl(options = {}): boolean {
  const { urlContainString = "" } = Object.assign({
    urlContainString: "",
  }, options);
  const Url = location.href;
  return Url.includes(urlContainString);
}

/**
 * Set the width and height of an image based on the parameters specified in the image's URL.
 * 
 * Use jQuery to select all `img` elements on the page and then checks each image's `src` attribute for `width` and `height` parameters. If these parameters are found, the function sets the image's width and height accordingly.
 * 
 * The width and height parameters in the URL should be in the format `width=<value><unit>` and `height=<value><unit>`, where `<value>` is a number and `<unit>` is a CSS unit like `px`, `rem`, or `vw`.
 * 
 * Example 1:
 * For an image with the URL `<img src="https://example.com/image.png?width=400px&height=200px" alt="file" />`, the function will execute `window.jQuery('img').width('400px')` and `window.jQuery('img').height('200px')`.
 * 
 * Example 2:
 * For an image with the URL `<img src="https://example.com/image.png?width=400rem&height=20vw" alt="file" />`, the function will execute `window.jQuery('img').width('400rem')` and `window.jQuery('img').height('20vw')`.
 * 
 * @returns {boolean} - Returns `true` if jQuery is available and the function was able to run, `false` otherwise.
 */
export function setImgWidthHeight(): boolean {
  const $ = window.jQuery || window.$;
  if ($) {
    $("img").each(function () {
      const $this = $(this);
      if (!$this) return;
      const src = $this.attr("src");
      if (!src) return;
      const width = src.match(/width=([0-9]+[a-z%]+)/);
      const height = src.match(/height=([0-9]+[a-z%]+)/);
      if (width && width[1]) $this.width(width[1]);
      if (height && height[1]) $this.height(height[1]);
    });
    return true;
  }
  return false;
}
