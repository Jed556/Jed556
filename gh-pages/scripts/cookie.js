function createCookie(name, value, hours) {
    let cookie = name + '=' + value;
    if (hours) {
        let date = new Date();
        date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
        cookie += '; expires=' + date.toGMTString();
    }
    cookie += '; path=/';
    document.cookie = cookie;
}

function readCookie(name) {
    let nameEQ = name + '=';
    let ca = document.cookie.split(';');
    console.log(ca);
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, '', -1);
}

function showCookieWarning() {
    let cookieContainer = document.createElement('div');
    cookieContainer.id = 'cookie-warning';

    let cookieText = document.createElement('p');
    cookieText.innerHTML = 'We use cookies to ensure you get the best experience on our website. <a href="#">Learn more</a>';

    let cookieButton = document.createElement('button');
    cookieButton.id = 'cookie-accept';
    cookieButton.innerHTML = 'Got it!';

    cookieButton.onclick = function() {
        acceptCookies();
        cookieContainer.style.display = 'none';
    };


    cookieContainer.appendChild(cookieText);
    cookieContainer.appendChild(cookieButton);

    document.body.appendChild(cookieContainer);

}

function acceptCookies() {
    createCookie('cookie-consent', 'true', 24);
}

function checkCookieConsent() {
    if (!readCookie('cookie-consent')) {
        showCookieWarning();
    }
}

window.onload = function() {
    //checkCookieConsent();
};