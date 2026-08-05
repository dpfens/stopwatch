"use strict";
var shareButtons = document.querySelectorAll('.js-share-click');
for (var i = 0; i < shareButtons.length; i++) {
    var shareButton = shareButtons[i];
    if ('share' in navigator) {
        shareButton.style.display = 'inline-block';
        shareButton.addEventListener('click', sharePage);
    } else {
        shareButton.style.display = 'none';
    }
}
function sharePage() {
    var url = document.location.href,
        title = document.title,
        canonicalElement = document.querySelector('link[rel=canonical]'),
        descriptionElement = document.querySelector('meta[name="description"]'),
        text = '';
    if (canonicalElement !== null) {
        url = canonicalElement.href;
    }
    if (descriptionElement !== null) {
        var descriptionContent = descriptionElement.getAttribute('content');
        if (descriptionContent) {
            text = descriptionContent;
        }
    }
    navigator.share({
        title: title,
        url: url,
        text: text
    })
    .then(function () {
        return console.log('Successful share');
    })
    .catch(function (error) {
        return console.log('Error sharing', error);
    });
}