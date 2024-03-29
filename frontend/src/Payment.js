import React, { useState, useEffect } from 'react'
import './Payment.css'
import { useStateValue } from './StateProvider';

import CheckoutProduct from './CheckoutProduct';
import { Link } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getBasketTotal } from './reducer';
import CurrencyFormat from 'react-currency-format'
import axios from 'axios';
import { useHistory } from 'react-router-dom'
import { db } from './firebase'
function Payment() {
    const [{ user, basket }, dispatch] = useStateValue();
    const history = useHistory()
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState(null)
    const [disabled, setDisabled] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [suceeded, setSuceeded] = useState(false)
    const [clientSecret, setClientSecret] = useState(true)

    useEffect(() => {
        // generate spl stripe secret which allows us to charge customer
        const getClientSecret = async () => {
            const response = await axios.post(`/payments/create?total=${getBasketTotal(basket) * 100}`
            )
            setClientSecret(response.data.clientSecret)
        }

        getClientSecret()
    }, [basket])

    console.log('THE SECRET IS >>>', clientSecret)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setProcessing(true)
        const payload = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardElement)
            }
        }).then(({ paymentIntent }) => {
            // payment confirmation
            db.collection('users').doc(user.uid).collection('orders').doc(paymentIntent.id).set({
                basket: basket,
                amount: paymentIntent.amount,
                created: paymentIntent.created
            })
            console.log(paymentIntent)
            setSuceeded(true)
            setProcessing(false)
            dispatch({ type: 'EMPTY_BASKET' })
            history.replace('/orders')
        })
    }
    const handleChange = e => {
        setDisabled(e.empty)
        setError(e.error ? e.error.message : "")
    }


    return (
        <div className="payment">
            <div className="payment__container">
                <h1>Checkout (<Link to="/checkout">{basket.length} items</Link>)</h1>
                <div className="payment__section">
                    <div className="payment__title">
                        <h3>Delivery Address</h3>
                    </div>
                    <div className="payment_address">
                        <p>{user ? user.email : ""}</p>
                        <p>123 React Lane</p>
                        <p>Los Angeles,CA</p>
                    </div>
                </div>
                <div className="payment__section">
                    <div className="payment__title"> <h3>Review items and Delivery</h3></div>

                    <div className="payment__items">
                        {basket.map(item => (
                            <CheckoutProduct id={item.id} title={item.title} image={item.image}
                                price={item.price}
                                rating={item.rating} />


                        ))}
                    </div>

                </div>
                <div className="payment__section">
                    <div className="payment__title"> <h3>Payment Method</h3></div>
                    <div className="payment__details">
                        <form onSubmit={handleSubmit}>
                            <CardElement onChange={handleChange} />
                            <div className="payment__priceContainer">
                                <CurrencyFormat renderText={(value) => (
                                    <h3>Order Total : {value}</h3>

                                )}
                                    decimalScale={2}
                                    value={getBasketTotal(basket)}
                                    displayType={"text"}
                                    thousandSeparator={true}
                                    prefix={"₹"}

                                />
                                <button disabled={processing || disabled || suceeded}>
                                    <span>{processing ? <p>Processing</p> : "Buy Now"}</span>
                                </button>
                            </div>
                            {error && <div>error</div>}
                        </form>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default Payment
