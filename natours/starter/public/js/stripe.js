import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async tourId => {
  const stripe = Stripe('pk_test_51NrNuxCqyTaxj7p9pj1DaTtOLeCXZJcAsnZbJW3XifUAkr75Cixm1WZH019kXFF3L1dvddSoQmVXbzcwByk0AKFL009qmIGnFE');
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    // console.log(session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};