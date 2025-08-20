import DMCommerceSandbox from "./DMCommerceSandbox.jsx";
import OrdersPage from "./OrdersPage.jsx";

export default function App() {
  return window.location.pathname === "/orders" ? <OrdersPage /> : <DMCommerceSandbox />;
}

