const Sequelize = require("sequelize");
require("dotenv").config();
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.Account = require("./account")(sequelize);
db.Company = require("./company")(sequelize);
db.Customer = require("./customer")(sequelize);
db.AboutUs = require("./aboutUs")(sequelize);
db.Post = require("./post")(sequelize);
db.PostImage = require("./postImage")(sequelize);
db.Villa = require("./villa")(sequelize);
db.CommercialStore = require("./commercialStore")(sequelize);
db.House = require("./house")(sequelize);
db.Reservation = require("./reservation")(sequelize);
db.Complaint = require("./complaint")(sequelize);
db.Favorite = require("./favorite")(sequelize);
db.ExternalAd = require("./externalAd")(sequelize);
db.Transaction = require("./transaction")(sequelize);
db.SocialMedia = require("./socialMedia")(sequelize);
db.VerificationCode = require("./verificationCode")(sequelize);
db.BlacklistedToken = require("./blacklistedToken")(sequelize);
db.Wallet = require("./wallet")(sequelize);

// Define relationships
db.Account.hasOne(db.Company, { foreignKey: "companyId", onDelete: "CASCADE" });
db.Company.belongsTo(db.Account, { foreignKey: "companyId" });

db.Account.hasOne(db.Customer, { foreignKey: "customerId", onDelete: "CASCADE" });
db.Customer.belongsTo(db.Account, { foreignKey: "customerId" });

db.Account.hasMany(db.Post, { foreignKey: "companyId", onDelete: "SET NULL", onUpdate: "CASCADE" });
db.Post.belongsTo(db.Account, { foreignKey: "companyId" });

// Company relationships
db.Company.hasOne(db.AboutUs, { foreignKey: "companyId", onDelete: "CASCADE" });
db.AboutUs.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.Complaint, { foreignKey: "companyId", onDelete: "CASCADE" });
db.Complaint.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.Transaction, { foreignKey: "companyId", onDelete: "CASCADE" });
db.Transaction.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasOne(db.SocialMedia, { foreignKey: "companyId", onDelete: "CASCADE" });
db.SocialMedia.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.VerificationCode, { foreignKey: "companyId", onDelete: "CASCADE" });
db.VerificationCode.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.Post, { foreignKey: "companyId", onDelete: "SET NULL", onUpdate: "CASCADE" });
db.Post.belongsTo(db.Company, { foreignKey: "companyId" });

// Post relationships
db.Post.hasMany(db.PostImage, { foreignKey: "postId", onDelete: "CASCADE" });
db.PostImage.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasOne(db.Villa, { foreignKey: "postId", onDelete: "CASCADE" });
db.Villa.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasOne(db.CommercialStore, { foreignKey: "postId", onDelete: "CASCADE" });
db.CommercialStore.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasOne(db.House, { foreignKey: "postId", onDelete: "CASCADE" });
db.House.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasMany(db.Reservation, { foreignKey: "postId", onDelete: "CASCADE" });
db.Reservation.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasMany(db.Favorite, { foreignKey: "postId", onDelete: "CASCADE" });
db.Favorite.belongsTo(db.Post, { foreignKey: "postId" });

// Customer relationships
db.Customer.hasMany(db.Reservation, { foreignKey: "customerId", onDelete: "CASCADE" });
db.Reservation.belongsTo(db.Customer, { foreignKey: "customerId" });

db.Customer.hasMany(db.Complaint, { foreignKey: "customerId", onDelete: "CASCADE" });
db.Complaint.belongsTo(db.Customer, { foreignKey: "customerId" });

db.Customer.hasMany(db.Favorite, { foreignKey: "customerId", onDelete: "CASCADE" });
db.Favorite.belongsTo(db.Customer, { foreignKey: "customerId" });

db.Customer.hasMany(db.Transaction, { foreignKey: "customerId", onDelete: "CASCADE" });
db.Transaction.belongsTo(db.Customer, { foreignKey: "customerId" });

// Reservation relationships
db.Reservation.hasMany(db.Transaction, { foreignKey: "reservationId", onDelete: "CASCADE" });
db.Transaction.belongsTo(db.Reservation, { foreignKey: "reservationId" });

// Advertisement relationships (admin via Account with role 'admin')
db.Account.hasMany(db.ExternalAd, { foreignKey: "adminId", constraints: false, onDelete: "CASCADE" });
db.ExternalAd.belongsTo(db.Account, { foreignKey: "adminId", constraints: false });

// Admin Wallet relationships
db.Account.hasOne(db.Wallet, { foreignKey: "adminId", onDelete: "CASCADE" });
db.Wallet.belongsTo(db.Account, { foreignKey: "adminId" });

module.exports = db;