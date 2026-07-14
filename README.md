# ChatBot Frontend — React + Vite + SignalR

## 1. Cài dependencies
```
npm install
```

## 2. Sửa port backend (quan trọng!)
Mở file `src/hooks/useSignalR.js`, sửa `HUB_URL` cho khớp với port
backend ASP.NET của bạn đang chạy:

```js
const HUB_URL = 'https://localhost:7001/chathub'
//                              ^^^^ sửa port này
```

Xem port backend ở terminal khi `dotnet run`:
  Now listening on: https://localhost:{PORT}

## 3. Chạy dev server
```
npm run dev
```
Mở browser tại http://localhost:5173

## Lưu ý
- Backend phải chạy trước khi mở frontend.
- Nếu browser báo lỗi SSL/certificate với localhost,
  truy cập thẳng vào backend URL một lần và chọn "Accept risk",
  sau đó reload lại frontend.
