const Review = require("../models/Review");

const Response = require("../helpers/response.helper");
const remove_Id = require("../utils/remove_Id");
const constant = require("../constants/index");

const {
  response: {
    createSuccessMessage,
    updateSuccessMessage,
    deleteSuccessMessage,
    failMessage,
  },
} = require("../constants");
const Product = require("../models/Product");

exports.getAll = async (req, res, next) => {
  let {
    query: { _page, _limit, q },
  } = req;

  try {
    _page = parseInt(_page) || 1;
    _limit = parseInt(_limit) || constant._limit;

    let reviews = await Review.find()
      .sort({ dateCreate: -1 })
      .populate("userId");
    let total = await Review.find().count();
    if (q) {
      reviews = reviews.filter((item, index) => {
        const currentIndex = item._doc.title
          .toLowerCase()
          .indexOf(q.toLowerCase());
        const currentIndex1 = item._doc.description
          .toLowerCase()
          .indexOf(q.toLowerCase());

        return currentIndex > -1 || currentIndex1 > -1;
      });
      total = reviews.length;
    }

    return Response.success(res, {
      reviews: remove_Id(
        reviews.slice((_page - 1) * _limit, (_page - 1) * _limit + _limit)
      ),
      total,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getByProduct = async (req, res, next) => {
  let {
    params: { productId },
    query: { _page, _limit },
  } = req;

  try {
    _page = parseInt(_page) || 1;
    _limit = parseInt(_limit) || constant._limit;

    if (!productId) throw new Error(failMessage);
    const product = await Product.findById(productId);
    if (!product) throw new Error(failMessage);

    const total = await Review.find({ productId }).count();
    let reviews = await Review.find({ productId })
      .sort({ dateCreate: -1 })
      .populate("userId")
      .skip((_page - 1) * _limit)
      .limit(_limit);
    if (!reviews || !total) throw new Error(failMessage);

    return Response.success(res, { reviews: remove_Id(reviews), total });
  } catch (error) {
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  let {
    params: { productId },
    body: { rate, title, description },
    user,
  } = req;

  try {
    rate = parseInt(rate) || 5;

    if (!productId || !title || !description || !user)
      throw new Error(failMessage);

    const product = await Product.findById(productId);
    if (!product) throw new Error(failMessage);

    let review = await Review.create({
      rate,
      title,
      description,
      userId: user._id,
      productId,
    });

    // Cập nhật lại đánh giá cho sản phẩm
    let total = 0;
    const reviews = await Review.find({ productId });
    if (!reviews) throw new Error(failMessage);
    for (let review of reviews) total += review.rate;
    await Product.findByIdAndUpdate(productId, {
      rate: total / reviews.length,
    });

    review = await Review.findById(review._id).populate("userId");
    review._doc.id = review._id;

    return Response.success(res, { message: createSuccessMessage, review });
  } catch (error) {
    return next(error);
  }
};

// Chỉ có thể chính chủ update comment
exports.update = async (req, res, next) => {
  let {
    params: { reviewId },
    body: { rate, title, description },
    user,
  } = req;

  try {
    if (!reviewId || !user) throw new Error(failMessage);
    let review = await Review.findById(reviewId);
    if (!review) throw new Error(failMessage);
    if (review.userId.toString() !== user._id.toString())
      throw new Error(failMessage);

    let obj = {};
    if (title) obj = { title };
    if (description) obj = { ...obj, description };
    if (rate) {
      rate = parseInt(rate);

      await Review.findByIdAndUpdate(reviewId, { ...obj, rate });

      // Cập nhật lại đánh giá cho sản phẩm
      let total = 0;
      const reviews = await Review.find({ productId: review.productId });
      if (!reviews) throw new Error(failMessage);
      for (let review of reviews) total += review.rate;
      await Product.findByIdAndUpdate(review.productId, {
        rate: total / reviews.length,
      });
    } else await Review.findByIdAndUpdate(reviewId, { ...obj });
    review = await Review.findById(reviewId).populate("productId");
    review._doc.id = review._id;

    return Response.success(res, { message: updateSuccessMessage, review });
  } catch (error) {
    return next(error);
  }
};

// Chỉ có thể chính chủ xóa comment - Hoặc Admin
exports.delete = async (req, res, next) => {
  const {
    params: { reviewId },
    user,
  } = req;

  try {
    if (!reviewId) throw new Error(failMessage);

    let review = await Review.findById(reviewId);
    if (!review) throw new Error(failMessage);
    if (
      user.role === "user" &&
      review.userId.toString() !== user._id.toString()
    )
      throw new Error(failMessage);

    await Review.findByIdAndDelete(reviewId);

    // Cập nhật lại đánh giá cho sản phẩm
    let total = 0;
    const reviews = await Review.find({ productId: review.productId });
    if (!reviews) throw new Error(failMessage);
    for (let review of reviews) total += review.rate;
    await Product.findByIdAndUpdate(review.productId, {
      rate: total / reviews.length,
    });

    return Response.success(res, { message: deleteSuccessMessage });
  } catch (error) {
    return next(error);
  }
};
