/*global window, document, chrome, console, Image, gsUtils */

(function () {

    //removed strict mode for compatibility with older versions of chrome
    //'use strict';
    var gsUtils = chrome.extension.getBackgroundPage().gsUtils;

    function generateFaviconUri(url, callback) {
        var img = new Image(),
            boxSize = 9;

        img.onload = function () {
            var canvas,
                context;
            canvas = window.document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            context = canvas.getContext('2d');
            context.globalAlpha = 0.5;
            context.drawImage(img, 0, 0);

            callback(canvas.toDataURL());
        };
        img.src = url || chrome.extension.getURL('img/default.ico');
    }

    function setFavicon(favicon) {
        document.getElementById('gsFavicon').setAttribute('href', favicon);
    }

    function htmlEncode(html) {
        return document.createElement('a').appendChild(document.createTextNode(html)).parentNode.innerHTML;
    }

    function attemptTabSuspend() {
        var url = gsUtils.getSuspendedUrl(window.location.hash),
            tabProperties,
            rootUrlStr = gsUtils.getRootUrl(url),
            showPreview = gsUtils.getOption(gsUtils.SHOW_PREVIEW),
            favicon,
            title,
            bodyEl = document.getElementsByTagName('body')[0],
            messageEl = document.getElementById('suspendedMsg'),
            titleEl = document.getElementById('gsTitle'),
            topBarEl = document.getElementById('gsTopBarTitle'),
            whitelistEl = document.getElementById('gsWhitelistLink'),
            topBarImgEl = document.getElementById('gsTopBarImg');

        //try to fetch saved tab information for this url
        gsUtils.fetchTabInfo(url).then(function(tabProperties) {

            //if we are missing some suspend information for this tab
            if (!tabProperties) {
                tabProperties = {url: url};
            }

            //set favicon and preview image
            if (showPreview) {
                gsUtils.fetchPreviewImage(url, function (previewUrl) {
                    if (previewUrl && previewUrl !== null) {

                        var previewEl = document.createElement('div');

                        previewEl.innerHTML = document.getElementById("previewTemplate").innerHTML;
                        previewEl.onclick = unsuspendTab;
                        bodyEl.appendChild(previewEl);

                        document.getElementById('gsPreviewImg').setAttribute('src', previewUrl);

                        messageEl.style.display = 'none';
                        previewEl.style.display = 'block';
                    }
                });

            } else {
                messageEl.style.display = 'table-cell';
            }

            favicon = tabProperties.favicon || 'chrome://favicon/' + url;

            generateFaviconUri(favicon, function (faviconUrl) {
                setFavicon(faviconUrl);
            });

            //populate suspended tab bar
            title = tabProperties.title ? tabProperties.title : rootUrlStr;
            title = title.indexOf('<') < 0 ? title : htmlEncode(title);
            titleEl.innerHTML = title;
            topBarEl.innerHTML = title;
            topBarEl.setAttribute('href', url);
            whitelistEl.innerText = 'Add ' + rootUrlStr + ' to whitelist';
            whitelistEl.setAttribute('data-text', rootUrlStr);
            topBarImgEl.setAttribute('src', favicon);
        });
    }

    function unsuspendTab() {
        var url = gsUtils.getSuspendedUrl(window.location.hash);
        window.location.replace(url);
    }

    function saveToWhitelist(e) {
        gsUtils.saveToWhitelist(e.target.getAttribute('data-text'));
        unsuspendTab();
    }

    window.onload = function () {

        document.getElementById('suspendedMsg').onclick = unsuspendTab;
        document.getElementById('gsWhitelistLink').onclick = saveToWhitelist;

        //try to suspend tab
        attemptTabSuspend();

        //set theme
        if (gsUtils.getOption(gsUtils.THEME) === 'dark') {
            document.querySelector('body').className = 'dark';
        }

        //add an unload listener to send an unsuspend request on page unload
        //this will fail if tab is being closed but if page is refreshed it will trigger an unsuspend
        window.addEventListener('beforeunload', function(event) {
            chrome.runtime.sendMessage({
                action: 'requestUnsuspendTab'
            });
        });

        

    };
}());
