// This version has cookie fallback for browsers that don't support local storage
const repoList = document.getElementById('repo-list');

function formatRepoData(repoData) {
    let repoListItem = document.createElement('li');
    repoListItem.className = 'repo-item';
    repoListItem.innerHTML = `<h2><a href="${repoData.html_url}" target="_blank">${repoData.name}</a></h2><p>${repoData.description}</p><p>Stars: ${repoData.stargazers_count} | Forks: ${repoData.forks_count}</p>`;
    return repoListItem;
}

function addReposToPage(repos) {
    let repoListItems = repos.map(formatRepoData);
    repoListItems.forEach((item) => {
        repoList.appendChild(item);
    });
}

function fetchRepos(username) {
    const apiUrl = `https://api.github.com/users/${username}/repos`;
    fetch(apiUrl)
        .then((response) => response.json())
        .then((data) => {
            addReposToPage(data);
            const cache = {
                data: data,
                timestamp: new Date().getTime(),
            };
            if (typeof Storage !== 'undefined') {
                console.log('[GitHub Repos] Writing to local storage');
                localStorage.setItem('github-repos', JSON.stringify(cache));
            } else {
                // Fallback to using cookies
                console.log('[GitHub Repos] Writing to cookie');
                document.cookie = `github-repos=${JSON.stringify(cache)};expires=${new Date(Date.now() + 3600000).toUTCString()};path=/`;
            }
        })
        .catch((error) => console.error(error));
}

function checkCache() {
    let cache;
    if (typeof Storage !== 'undefined') {
        console.log('[GitHub Repos] Reading local storage');
        cache = JSON.parse(localStorage.getItem('github-repos'));
    } else {
        // Fallback to using cookies
        console.log('[GitHub Repos] Reading cookie');
        console.log(document.cookie);
        const cookie = document.cookie.match('(^|;)\\s*github-repos\\s*=\\s*([^;]+)');
        if (cookie) {
            cache = JSON.parse(cookie[2]);
        }
    }
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;

    if (cache && cache.timestamp && (now - cache.timestamp) < oneHour) {
        console.log('[GitHub Repos] Using cached data');
        addReposToPage(cache.data);
    } else {
        console.log('[GitHub Repos] Using and caching fetched data');
        fetchRepos('Jed556');
    }
}

window.addEventListener('load', () => {
    checkCache();
});