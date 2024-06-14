
//用async+await因為跟api要的資料馬上會給使用者看到
document.addEventListener('DOMContentLoaded', async() => {
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