let observer;

document.addEventListener('DOMContentLoaded', function () {
    fetchAttractions(0);
    fetchMRTStations();

    observer = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin: '0px',
        threshold: 0
    });

    const sentinel = document.createElement('div');
    sentinel.id = 'sentinel';
    document.body.appendChild(sentinel);
    observer.observe(sentinel);

    document.getElementById('search-button').addEventListener('click', function () {
        const keyword = document.getElementById('search-input').value;
        searchAttractions(keyword);
    });

    //MRT 左右滑動的按鍵
    document.getElementById('scroll-left').addEventListener('click', function() {
        document.getElementById('mrt-list').scrollBy({ left: -200, behavior: 'smooth' });
    });

    document.getElementById('scroll-right').addEventListener('click', function() {
        document.getElementById('mrt-list').scrollBy({ left: 200, behavior: 'smooth' });
    });

});






let currentPage = 0;
let fetching = false;

function fetchAttractions(page, keyword = '') {
    if (fetching) return;
    fetching = true;

    fetch(`/api/attractions/?page=${page}&keyword=${encodeURIComponent(keyword)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const gridContent = document.getElementById('grid-content');
            if (page === 0) {
                gridContent.innerHTML = '';
            }

            data.data.forEach(attraction => {
                const card = createAttractionCard(attraction);
                gridContent.appendChild(card);
            });

            // Ensure the sentinel is re-created and appended if necessary
            let sentinel = document.getElementById('sentinel');
            if (!sentinel) {
                sentinel = document.createElement('div');
                sentinel.id = 'sentinel';
            }
            gridContent.appendChild(sentinel);

            observer.observe(sentinel);

            currentPage = data.nextPage;
            fetching = false;
        })
        .catch(error => {
            console.error('Error loading the attractions:', error);
            fetching = false;
        });
}


//MRT捷運站FUNTION
function fetchMRTStations() {
    fetch('/api/mrts')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const mrtList = document.getElementById('mrt-list');
            data.data.forEach(station => { // Access the 'data' array in the response
                const stationItem = document.createElement('div');
                stationItem.className = 'mrt-item';
                stationItem.textContent = station;

                //增加了點擊捷運站名就會將他送進關鍵字搜尋的eventlistener!
                stationItem.addEventListener('click', function(){
                    document.getElementById('search-input').value = station;
                    searchAttractions(station);
                });

                mrtList.appendChild(stationItem);
            });
        })
        .catch(error => {
            console.error('Error loading MRT stations:', error);
        });
}









//用關鍵字找景點
function searchAttractions(keyword) {
    currentPage = 0;
    fetchAttractions(currentPage, keyword);
}

//產生每個景點的<div><class>，包括圖片、名稱、捷運站、分類，
function createAttractionCard(attraction) {
    const card = document.createElement('div');
    card.className = 'card';
    //增加了每個景點獨特的id以及偵測有沒有被click
    card.id = attraction.id;
    card.addEventListener('click', function(){
        //要記得用backticks``做string interpolation
        window.location.href = `/attraction/${attraction.id}`;
    });

    const image = document.createElement('img');
    image.src = attraction.images[0];
    image.alt = attraction.name;
    image.className = 'attraction-image';

    const name = document.createElement('div');
    name.textContent = attraction.name;
    name.className = 'attraction-name';

    const category = document.createElement('div');
    category.textContent = attraction.category;
    category.className = 'attraction-category';

    const mrt = document.createElement('div');
    mrt.textContent = attraction.mrt;
    mrt.className = 'attraction-mrt';

    card.appendChild(image);
    card.appendChild(name);
    card.appendChild(category);
    card.appendChild(mrt);

    return card;
}

function handleIntersection(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting && currentPage !== null) {
            const keyword = document.getElementById('search-input').value;
            fetchAttractions(currentPage, keyword);
        }
    });
}

