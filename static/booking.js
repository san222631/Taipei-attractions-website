document.addEventListener('DOMContentLoaded', async() => {
    const userInfo = await fetchUserInfo();

    if (userInfo) {
        //加入會換名字的問候語
        console.log(userInfo)
        const greeting = document.getElementById('greeting');
        greeting.textContent = `您好，${userInfo.name}，待預定的行程如下:`;
        fetchBookingDetails();
    } else {
        window.location.href = '/';
    }


    //拿url的port以後的部分，這邊是拿"8000/"以後的"/attraction/id"
    const pathname = window.location.pathname;
    //得到"/attraction/id"以後，用/分開然後取最後一個
    const specialId = pathname.split('/').pop();


    //按台北一日遊就回首頁
    const goIndex = document.getElementById('go-index');
    goIndex.addEventListener('click', function(){
        window.location.href = '/';
    });


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
    });


    //限制輸入信用卡資料的格式
    const cardNumberInput = document.getElementById('card-number');
    const expDateInput = document.getElementById('exp-date');

    cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
        e.target.value = formattedValue;
    });

    expDateInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = value.replace(/^(\d{2})(\d{2})/, '$1/$2');
        e.target.value = formattedValue.substring(0, 5);
    });

    document.getElementById('order-form').addEventListener('submit', function(e) {
        const expDate = expDateInput.value;
        const expDatePattern = /^(0[1-9]|1[0-2])\/\d{2}$/; // MM/YY format

        if (!expDatePattern.test(expDate)) {
            alert('請輸入有效的過期時間 (MM/YY)');
            e.preventDefault(); // Prevent form submission
        }
    });
});

//去資料庫拿特定user的購物車的資料
async function fetchBookingDetails() {
    const token = localStorage.getItem('received_Token');
    try {
        const response = await fetch(`/api/booking`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(response)
        if (!response.ok) {
            throw new Error(`/api/booking的response有錯誤: ${response.statusText}`);
        }

        const data = await response.json();
        //加入各種booking細節或是出現"目前沒有預定行程"
        if (data && data.data) {
            addBooking(data);
        } else {
            //沒有預定行程在資料庫，因此隱藏預定行程，顯示無行程
            const bookingFound1 = document.getElementById('booking-found-1');
            const bookingFound2 = document.getElementById('booking-found-2');
            const noBooking = document.getElementById('no-booking');
            bookingFound1.classList.remove('visible');
            bookingFound2.classList.remove('visible');
            noBooking.classList.add('visible');
            document.getElementById('no-booking').textContent = '目前沒有任何待預定的行程';
        }
        
    } catch (error) {
        console.error('收到response前有錯誤:', error);
    }
}


let fetching = false;

//在HTML加入各種資料
function addBooking(data_booking) {
    if (fetching) return;
    fetching = true;

    //有預定行程在資料庫，因此顯示預定行程
    const bookingFound1 = document.getElementById('booking-found-1');
    const bookingFound2 = document.getElementById('booking-found-2');
    const noBooking = document.getElementById('no-booking');
    bookingFound1.classList.add('visible');
    bookingFound2.classList.add('visible');
    noBooking.classList.remove('visible');

    //加入圖片
    const first_image = document.getElementById('first-image');
    const image_itself = document.createElement('img');
    image_itself.src = data_booking.data.attraction.image;
    image_itself.className = 'image-itself';
    image_itself.alt = data_booking.data.attraction.name;
    first_image.appendChild(image_itself);

    //加入booking資料庫內的景點資料
    const booking_name = document.getElementById('name');
    booking_name.textContent = `台北一日遊: ${data_booking.data.attraction.name}`;
    
    const booking_date = document.getElementById('date');
    booking_date.textContent = `日期: ${data_booking.data.date}`;

    const booking_time = document.getElementById('time');
    booking_time.textContent = `時間: ${data_booking.data.time}`;

    const booking_price = document.getElementById('price');
    booking_price.textContent = `費用: ${data_booking.data.price}元`;

    const booking_address = document.getElementById('address');
    booking_address.textContent = `地點: ${data_booking.data.attraction.address}`;

    //加入刪除按鈕
    const delete_button = document.getElementById('delete-booking');
    delete_button.addEventListener('click', async function(){
        deleteBooking();
    }); 
    

    const total_price = document.getElementById('total-price');
    total_price.textContent = `總價: 新台幣${data_booking.data.price}元`;
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




//刪除booking資料庫
async function deleteBooking() {
    const token = localStorage.getItem('received_Token');

    try {
        const response = await fetch(`/api/booking`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`/api/booking的response有錯誤: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.ok) {
            //刪除成功的話，refresh page載入資料
            await fetchBookingDetails();
        } else {
            throw new Error('刪除行程失敗');
        }
    } catch (error) {
        console.error('刪除行程時發生錯誤:', error);
        alert('刪除行程時發生錯誤');
    }
}