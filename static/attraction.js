
//用async+await因為跟api要的資料馬上會給使用者看到
document.addEventListener('DOMContentLoaded', async() => {
    fetchUserInfo()
    //拿url的port以後的部分，這邊是拿"8000/"以後的"/attraction/id"
    const pathname = window.location.pathname;
    //得到"/attraction/id"以後，用/分開然後取最後一個
    const specialId = pathname.split('/').pop();


    try {
        //等fetch call拿到promise以後才做下一步動作
        const response = await fetch(`/api/attraction/${specialId}`);
        //如果response有問題
        if (!response.ok) {
            throw new Error(`/api/attraction/id送過來的response有錯誤: ${response.statusText}`);
        }

        //把收到的response變成json格式
        const data = await response.json();
        //檢查json
        console.log(data);

        addDetails(data);

    } catch (error) {
        console.error('收到response前有錯誤:', error);
        document.getElementById('check').textContent = '加載細節失敗';
    }

    //處理登入
    const modal = document.getElementById('modal');
    const loginRegister = document.getElementById('login-register');
    const closeButton = document.getElementById('close-button');
    const loginButton = document.getElementById('login-button');
    const errorMessage = document.getElementById('error-message');
    const login_register = document.getElementById('login-register')
    const logout = document.getElementById('logout')
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
          return response.json().then(data => {
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
              location.reload()
          } else {
              throw new Error('無效的token response');
          }
        })
        .catch(error => {
          if (error.data && error.data.detail) {
              errorMessage.textContent = error.data.detail.message;
              console.error(error.data.detail); // Log the entire detail object
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

    window.addEventListener('click', (event) => {
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
            if (!response.ok) {
                return response.json().then(data => {
                    //console.log("收到的response裡面的data:", data)
                    const error = new Error('HTTP error');
                    error.data = data;
                    throw error;
                });
              }
              return response.json();
        })
        .then(data => {
            if (data){
                console.log(data);
                R_errorMessage.textContent = '註冊成功';
            } else {
                throw new Error('無效的註冊data response');
            }            
        })
        .catch(error => {
            if (error.data && error.data.detail) {
                R_errorMessage.textContent = error.data.detail.message;
                console.error(error.data.detail); // Log the entire detail object
            } else {
                errorMessage.textContent = error.message;
                console.error('Error是:', error.message || error);
            }
        });
    })
});



//避免使用者手賤一秒按10次
let fetching = false;

//加入各種資料
function addDetails(details) {
    if (fetching) return;
    fetching = true;

    const goIndex = document.getElementById('go-index');
    goIndex.addEventListener('click', function(){
        window.location.href = '/';
    });

    const imageList = document.getElementById('image-list');   

    details.data.images.forEach(image => {
        const picture = document.createElement('img');
        picture.src = image
        picture.className = 'picture';
        picture.alt = details.data.name;
        imageList.appendChild(picture);
    });

    //一開始先幫每張圖片加入圈圈，然後把第一張的class變成active
    const circleList = document.getElementById('allCircles');
    details.data.images.forEach((_, index) => {
        const circle = document.createElement('div');
        circle.className = 'circle';
        //circle的class本來是.circle，現在變.circle.active
        if (index === 0) circle.classList.add('active');
        circleList.appendChild(circle);
    })

    //圖片slide show的關鍵
    setupCarousel();

    //加入不同的內容
    const name = document.getElementById('name');
    name.textContent = details.data.name;

    const CAT_MRT = document.getElementById('CAT_MRT');
    CAT_MRT.textContent = `${details.data.category} at  ${details.data.mrt}`;

    const description = document.getElementById('description');
    description.textContent = details.data.description;

    const address = document.getElementById('address');
    address.textContent = details.data.address;

    const transport = document.getElementById('transport');
    transport.textContent = details.data.transport;    
}


//圖片slide show旋轉木馬的關鍵
function setupCarousel() {
    //選擇所有的圖片+確認總共有幾張
    const imageList = document.getElementById('image-list');
    const allImages = imageList.querySelectorAll('img');
    const numberImages = allImages.length;
    //選擇所有的circle elements
    const allCircles = document.querySelectorAll('.circle');
    //從第1張圖片開始, index=0
    let currentIndex = 0;


    //操縱css裡面.image-list的transform
    //在X軸上translate移動
    //移動圖片的同時，也讓圈圈的class轉換，用圖片的index確認是哪一個圈圈要變active
    function showImage(index) {
        imageList.style.transform = `translateX( -${index *100}%)`;
        allCircles.forEach((eachCircle, i) => {
            eachCircle.classList.toggle('active', i === index);
        })
    };

    document.getElementById('scroll-left').addEventListener(
        'click', function() {
            currentIndex = (currentIndex - 1 + numberImages) % numberImages;
            showImage(currentIndex);
        }
    );

    document.getElementById('scroll-right').addEventListener(
        'click', function() {
        currentIndex = (currentIndex + 1) % numberImages;
        showImage(currentIndex);
        }
    );

    showImage(currentIndex);
};



//顯示及時價格
function updateCost() {
    //querySelector用來選第一個有這個name、class、tag、attribute屬性的element，或選多個elements
    const selectedTime = document.querySelector('input[name="time"]:checked').value;
    //getElementById只能選一個element
    const costElement = document.getElementById('real-price');

    if (selectedTime === 'morning') {
        costElement.textContent = '新台幣 2000元';
    } else if (selectedTime === 'afternoon') {
        costElement.textContent = '新台幣 2500元';
    }
}





//每次重新整理頁面，都檢查一次使用者的TOKEN
function fetchUserInfo() {
    const token = localStorage.getItem('received_Token');

    if (!token) {
        console.error('LocalStorage沒有Token!');
        renderLogin();
        //如果沒有token，直接回傳一個promise，讓其他功能也可以使用
        return Promise.resolve(null);
    }
    //這個return很重要，因為有這個才有完整的promise chain，其他功能可以使用驗證以後的promise
    return fetch('/api/user/auth', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response不ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
        //如果使用者token正確，要把收到的data傳給以後的promise chain
        if (data && data.data){
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