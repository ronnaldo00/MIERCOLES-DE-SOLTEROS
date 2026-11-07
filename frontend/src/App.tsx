import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './paginas/Home';
import Evento from './paginas/Evento';
import NoEncontrado from './paginas/NoEncontrado';
import {
  EventCheckout,
  PaymentSelect,
  PaymentCard,
  PaymentNequi,
  PaymentPSE,
  PSEResult,
  Receipt,
  TemaCheckoutProvider,
} from './checkout';
import { marca } from './marca';

const temaCheckout = {
  primario: marca.paleta.checkout_primario,
  acento: marca.paleta.blanco,
  fondo: marca.paleta.fondo,
  superficie: marca.paleta.fondo_gris,
  texto: marca.paleta.blanco,
};

export default function App() {
  return (
    <TemaCheckoutProvider tema={temaCheckout}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/evento/:urlname" element={<Evento />} />

          <Route path="/evento/:urlname/checkout" element={<EventCheckout />} />
          <Route path="/pago/seleccionar" element={<PaymentSelect />} />
          <Route path="/pago/tarjeta" element={<PaymentCard />} />
          <Route path="/pago/nequi" element={<PaymentNequi />} />
          <Route path="/pago/pse" element={<PaymentPSE />} />
          <Route path="/pago/pse/resultado" element={<PSEResult />} />
          <Route path="/pago/recibo/:transactionId" element={<Receipt />} />

          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </BrowserRouter>
    </TemaCheckoutProvider>
  );
}
