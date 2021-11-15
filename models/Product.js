const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // 'new', 'hot', empty
  status: {
    type: Object,
  },
  des: {
    type: String,
  },
  shortDes: {
    type: String,
  },
  img: {
    type: Array,
    default: ["https://picsum.photos/200"],
  },
  price: {
    type: Number,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
    default: 0,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  dateCreate: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Product", ProductSchema, "products");