const repoList = document.getElementById('repo-list');

function filterRepos(repos) {
    return repos.filter((repoData) => {
        return !repoData.archived && !repoData.fork && repoData.name !== "Jed556";
    });
}

function formatRepoData(repoData) {
    let repoListItem = document.createElement('li');
    repoListItem.className = 'repo-item';
    repoListItem.innerHTML = `
    <a href="${repoData.html_url}" target="_blank">
        <div class="content">
            <div class="header">
                <h2 class="name">${repoData.name}</h2>
                <p class="description">${repoData.description}</p>
            </div>
            <div class="repo-stats">
                <span class="language">${repoData.language}</span>
                <span class="stars"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" fill-rule="evenodd" d="M8 .64l2.474 5.285 5.526.822-4 4.107.943 6.166L8 12.342l-4.943 2.677.943-6.166-4-4.107 5.526-.822L8 .64z"/></svg> ${repoData.stargazers_count}</span>
                <span class="updated"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" fill-rule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a2.5 2.5 0 0 1 2.5 2.5c0 .878-.47 1.64-1.168 2.047l-.187.092v2.623l.002.133h-.001a.5.5 0 0 1-.5.5h-.274a.5.5 0 0 1-.5-.5l.002-.06v-2.582l-.187-.092A2.502 2.502 0 0 1 5.5 5.5 2.5 2.5 0 0 1 8 3z"/></svg> ${new Date(repoData.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
        </div>
    </a>
    `;
    return repoListItem;
}


function addReposToPage(repos) {
    let filteredRepos = filterRepos(repos);
    let repoListItems = filteredRepos.map(formatRepoData);
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
            localStorage.setItem('github-repos', JSON.stringify(cache));
        })
        .catch((error) => console.error(error));
}

function checkCache() {
    const cache = JSON.parse(localStorage.getItem('github-repos'));
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