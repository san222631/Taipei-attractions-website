let observer;

document.addEventListener('DOMContentLoaded', function () {
    fetchUserInfo()
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
        fetchUserInfo()
    });

    //MRT 左右滑動的按鍵
    document.getElementById('scroll-left').addEventListener('click', function() {
        document.getElementById('mrt-list').scrollBy({ left: -200, behavior: 'smooth' });
    });

    document.getElementById('scroll-right').addEventListener('click', function() {
        document.getElementById('mrt-list').scrollBy({ left: 200, behavior: 'smooth' });
    });


    //處理登入
    const modal = document.getElementById('modal');
    const loginRegister = document.getElementById('login-register');
    const closeButton = document.getElementById('close-button');
    const loginButton = document.getElementById('login-button');
    const errorMessage = document.getElementById('error-message');
    const logout = document.getElementById('logout');
    const authForm = document.getElementById('auth-form');

  
    loginRegister.addEventListener('click', () => {
      modal.style.display = 'block';
    });
  
    closeButton.addEventListener('click', () => {
      modal.style.display = 'none';
      errorMessage.textContent = ''; //為什麼每次關閉前要加這個?
    });
  
    window.addEventListener('mousedown', (event) => {
      if (event.target == modal) {
        modal.style.display = 'none';
        errorMessage.textContent = '';
      }
    });
  
    authForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
  
      fetch('/api/user/auth', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, password: password })
      })
      .then(response => {
        return response.json()
        .then(data => {
            if (!response.ok) {
                const error = new Error('HTTP error');
                error.data = data;
                throw error;
            }
            return data;
        });
      })
      .then(data => {
        if (data.token){
            localStorage.setItem('received_Token', data.token);
            console.log(data);
            modal.style.display = 'none';
            errorMessage.textContent = '';
            renderLogout()
        } else {
            throw new Error('無效的token response');
        }
      })
      .catch(error => {
        if (error.data) {
            errorMessage.textContent = error.data.message;
            console.error(error.data); // Log the entire detail object
        } else {
            errorMessage.textContent = error.message;
            console.error('Error是:', error.message || error); 
        }
      });
    });



    //註冊    
    const registerButton = document.getElementById('register');
    const R_modal = document.getElementById('R-modal'); 
    const R_closeButton = document.getElementById('R-close-button');
    const R_errorMessage = document.getElementById('R-error-message');
    const back_to_login = document.getElementById('back-to-login');
    const R_form = document.getElementById('R-form');

    registerButton.addEventListener('click', function(){
        errorMessage.textContent = '';
        modal.style.display = 'none';
        R_modal.style.display = 'block';
    });

    R_closeButton.addEventListener('click', function(){
        R_modal.style.display = 'none';
        R_errorMessage.textContent = '';
    });

    back_to_login.addEventListener('click', function(){
        R_errorMessage.textContent = '';
        R_modal.style.display = 'none';
        modal.style.display = 'block';
    });

    window.addEventListener('mousedown', (event) => {
        if (event.target == R_modal) {
          R_modal.style.display = 'none';
          R_errorMessage.textContent = '';
        }
    });   

    R_form.addEventListener('submit', function(event){
        event.preventDefault(); //避免預設的submission
        const R_name = document.getElementById('R-name').value;
        const R_email = document.getElementById('R-email').value;
        const R_password = document.getElementById('R-password').value;

        fetch('/api/user', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify({name: R_name, email: R_email, password: R_password})
        })
        .then(response => {  
            return response.json()
            .then(data => {
                if (!response.ok) {
                    const error = new Error('HTTP error');
                    error.data = data;
                    throw error;
                }
                return data;
            });
        })
        .then(data => {
            if (data.ok){
                console.log(data);
                R_errorMessage.textContent = '註冊成功';
            } else {
                throw new Error('無效的註冊data response');
            }            
        })
        .catch(error => {
            if (error.data) {
                R_errorMessage.textContent = error.data.message;
                console.error(error.data); // Log the entire detail object
            } else {
                errorMessage.textContent = error.message;
                console.error('Error是:', error.message || error);
            }
        });
    })
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
                    fetchUserInfo();
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




//每次重新整理頁面，都檢查一次使用者的TOKEN
function fetchUserInfo() {
    const token = localStorage.getItem('received_Token');

    //這個return很重要，因為有這個才有完整的promise chain，其他功能可以使用驗證以後的promise
    return fetch('/api/user/auth', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            //token ? ... : ... 這個確認token變數是不是truthy，非null,undefined, empty string
            //如果truthy，冒號前面的會執行; falsy的話，後面的empty string會執行
            'Authorization': token ? `Bearer ${token}` : ''
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('網路response was not ok')
        }
        return response.json();
    }
    )
    .then(data => {
        console.log(data);
        //如果使用者token正確，要把收到的data傳給以後的promise chain
        if (data !== null && data.data){
            renderLogout();
            return data.data;
        } else {
            //如果使用者token不正確，要把null傳給以後的promise chain
            renderLogin();
            return null;
        }
    })
    .catch(error => {
        //如果使用者token不正確，要把null傳給以後的promise chain
        console.error('Error fetching user info:', error);
        renderLogin();
        return null;
    });
}

//render 登出系統
function renderLogout(){
    document.getElementById('login-register').style.display = 'none';
    document.getElementById('logout').style.display = 'block';
    document.getElementById('login-register').classList.remove('visible');
    document.getElementById('logout').classList.add('visible');
}
//render 登入/註冊
function renderLogin(){
    document.getElementById('logout').style.display = 'none';
    document.getElementById('login-register').style.display = 'block';
    document.getElementById('logout').classList.remove('visible');
    document.getElementById('login-register').classList.add('visible');
}

//登出功能
document.getElementById('logout').addEventListener('click', function(){
    localStorage.removeItem('received_Token');
    //登出後重整頁面
    location.reload();
})