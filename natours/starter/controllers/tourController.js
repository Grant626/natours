const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

//upload.single('image') req.file
//upload.array('images', 5) req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

// const tours = JSON.parse(
//   fs.readFileSync(
//     `${__dirname}/../dev-data/data/tours-simple.json`
//   )
// );

// exports.checkID = (req, res, next, val) => {
//   console.log('Tour id is ' + val);
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid ID',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   console.log(`Creating tour ${req.body.name} with price of ${req.body.price}`);

//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Name or price of tour is missing.',
//     });
//   }
//   next();
// }

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};


exports.getAllTours = factory.getAll(Tour);
// catchAsync(async (req, res, next) => {
//   //EXECUTE QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   //SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours
//     },
//   });
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });
  // const tour = tours.find((el) => el.id === id);
  // // if (id > tours.length) {

  // res.status(200).json({
  //   status: 'success',
  //   data: {
  //     tour: tour,
  //   },
  // });
// });

exports.createTour = factory.createOne(Tour);
// catchAsync(async (req, res, next) => {
  
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

exports.updateTour = factory.updateOne(Tour);
// catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   } )

//   if(!tour) {
//     return next(new AppError('No tour found with that ID', 404))
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     },
//   });
// });

exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if(!tour) {
//     return next(new AppError('No tour found with that ID', 404))
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: { 
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' } 
      }
    },
    {
      $sort: { avgPrice: 1 }
    },
    // {
    //   $match: { _id:{ $ne: "EASY" } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      },
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

//router.route('/tours-within/:distance/center/:latlng/unit/:unit', tourController.getToursWithin);
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  //calculate in radians based on earths radius (km || mi)
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if(!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  // console.log(distance, lat, lng, unit);

  const tours = await Tour.find({ 
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } 
  });

  res.status(200).json({
    status: 'success',
    data: tours
  });

});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if(!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: { 
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1 ]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ])

  res.status(200).json({
    status: 'success',
    data: distances
  });

});
