document.addEventListener('DOMContentLoaded', async() => {
    //連上TAPPAY
    const APP_IP = '151825';
    const APP_KEY = 'app_Idf5nklHD5lm9I0kpTtnzc3DLDv9EEFnmQUpj205kr5LAvufIEAdeE0iOzKS';
    const SERVER_TYPE = 'sandbox';

    TPDirect.setupSDK(APP_IP, APP_KEY, SERVER_TYPE);
    TPDirect.card.setup({
        fields: {
            number: {
                element: '#card-number',
                placeholder: '**** **** **** ****'
            },
            expirationDate: {
                element: '#card-expiration-date',
                placeholder: 'MM / YY'
            },
            ccv: {
                element: '#card-ccv',
                placeholder: 'ccv'
            }
        },
        styles: {
            'input': {
                'color': 'gray'
            },
            ':focus': {
                'color': 'black'
            },
            '.valid': {
                'color': 'green'
            },
            '.invalid': {
                'color': 'red'
            },
            '@media screen and (max-width: 400px)': {
                'input': {
                    'color': 'orange'
                }
            }
        },
        isMaskCreditCardNumber: true,
        maskCreditCardNumberRange: {
            beginIndex: 6,
            endIndex: 11
        }
    });

    // Enable or disable the submit button based on the card form's state
    TPDirect.card.onUpdate(function (update) {
        const submitButton = document.getElementById('O-button');

        if (update.canGetPrime) {
            // Enable the submit button
            submitButton.removeAttribute('disabled');
        } else {
            // Disable the submit button
            submitButton.setAttribute('disabled', true);
        }

        // Optionally, handle card type
        if (update.cardType === 'visa') {
            // Handle card type visa.
        }

        // Handle the status of each field
        const fields = ['number', 'expiry', 'ccv'];
        fields.forEach(field => {
            const fieldStatus = update.status[field];
            const fieldElement = document.getElementById(`card-${field}`);
            if (fieldStatus === 2) {
                setFieldToError(fieldElement);
            } else if (fieldStatus === 0) {
                setFieldToSuccess(fieldElement);
            } else {
                setFieldToNormal(fieldElement);
            }
        });
    });

    function setFieldToNormal(field) {
        const fieldElement = document.getElementById(field);
        if (fieldElement) {
            fieldElement.style.borderColor = "";
        }
    }
    
    function setFieldToSuccess(field) {
        const fieldElement = document.getElementById(field);
        if (fieldElement) {
            fieldElement.style.borderColor = "green";
        }
    }
    
    function setFieldToError(field) {
        const fieldElement = document.getElementById(field);
        if (fieldElement) {
            fieldElement.style.borderColor = "red";
        }
    }


    const bookingInfo = await fetchBookingDetails();
    //測試是否有錯!!!!!!!!!!!!!!!!!!!
    if (!bookingInfo || !bookingInfo.data) {
        console.error('Booking details are missing');
        // Handle the case where bookingInfo is missing
    } else {
        console.log(bookingInfo);
    }


    // Handle form submission
    document.getElementById('order-form').addEventListener('submit', onSubmit);
    
    // Define the onSubmit function
    function onSubmit(event) {
        event.preventDefault(); // Prevent the form from submitting normally

        // Get the TapPay Fields status
        const tappayStatus = TPDirect.card.getTappayFieldsStatus();

        if (tappayStatus.canGetPrime) {
            // Get prime
            TPDirect.card.getPrime((result) => {
                if (result.status !== 0) {
                    alert('Failed to get prime: ' + result.msg);
                    return;
                }

                alert('Get prime success, prime: ' + result.card.prime);

                // Send prime to your server
                const token = localStorage.getItem('received_Token');
                fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        prime: result.card.prime,
                        order: {
                            price: bookingInfo.price,
                            trip: {
                                attraction: {
                                    id: bookingInfo.attraction.id,
                                    name: bookingInfo.attraction.name,
                                    address: bookingInfo.attraction.address,
                                    image: bookingInfo.attraction.image
                                }
                            },
                            date: bookingInfo.date,
                            time: bookingInfo.time                         
                        },
                        contact: {
                            name: document.getElementById('O-name').value,
                            email: document.getElementById('O-email').value,
                            phone: document.getElementById('O-phone').value
                        }
                    })
                }).then(response => {
                    return response.json();
                }).then(data => {
                    if (data.data.payment.status == 0) {
                        alert('付款成功');
                        window.location.href = `/thankyou?number=${data.data.number}`;
                    } else {
                        alert('付款失敗: ' + data.data.payment.message);
                        window.location.href = `/thankyou?number=${data.data.number}`;
                    }
                }).catch(error => {
                    console.error('Error:', error);
                    alert('付款失敗以及伺服器內部錯誤: ' + error.message);
                });
            });
        } else {
            alert('Please complete the card information correctly.');
        }
    }
    

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
            console.log('/api/booking收到的response:', data.data);
            return data.data; //儲存到const attractionInfo
        } else {
            //沒有預定行程在資料庫，因此隱藏預定行程，顯示無行程
            const bookingFound1 = document.getElementById('booking-found-1');
            const bookingFound2 = document.getElementById('booking-found-2');
            const noBooking = document.getElementById('no-booking');
            bookingFound1.classList.remove('visible');
            bookingFound2.classList.remove('visible');
            noBooking.classList.add('visible');
            document.getElementById('no-booking').textContent = '目前沒有任何待預定的行程';
            return null;
        }
        
    } catch (error) {
        console.error('收到response前有錯誤:', error);
        return null;
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