const path = require('path');
const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');
const bodyParser = require('body-parser');


const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.options('*', cors());

//serving static files
//app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

//MIDDLEWARE
//Set security HTTP headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {

      defaultSrc: ["'self'", 'data:', 'blob:'],
 
      baseUri: ["'self'"],
 
      fontSrc: ["'self'", 'https:', 'data:'],
 
      scriptSrc: ["'self'", 'https://*.cloudflare.com'],
 
      scriptSrc: ["'self'", 'https://*.stripe.com'],
 
      scriptSrc: ["'self'", 'http:', 'https://*.mapbox.com', 'data:'],
 
      frameSrc: ["'self'", 'https://*.stripe.com'],
 
      objectSrc: ["'none'"],
 
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
 
      workerSrc: ["'self'", 'data:', 'blob:'],
 
      childSrc: ["'self'", 'blob:'],
 
      imgSrc: ["'self'", 'data:', 'blob:'],
 
      connectSrc: ["'self'", "blob:", "http://*.mapbox.com"]
    },
  })
);

//Devlopment logging
if(process.env.NODE_ENV === 'development'){
  app.use(morgan('dev'));
}

//limit request from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

app.post(
  '/webhook-checkout', 
  bodyParser.raw({type: 'application/json'}), 
  bookingController.webhookCheckout
);

//body parser, reading data from body into req.body
app.use(express.json({
  limit: '10kb'
}));
app.use(express.urlencoded({extended: true, limit: '10kb'}));
app.use(cookieParser())

//Data sanitation against noSQL query injection
app.use(mongoSanitize());

//Data sanitation against XSS
app.use(xss());


//Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ]
}));

app.use(compression());

//test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  //error object from ./utils/AppError.js 
  next(new AppError(`Cant find ${req.originalUrl} on this server!`, 404));
})

//express knows error handling middleware because of 4 args
app.use(globalErrorHandler);

// Set security HTTP headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false
  })
);

module.exports = app;