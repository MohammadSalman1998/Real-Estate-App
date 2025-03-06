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

// Define relationships
// Account relationships
db.Account.hasOne(db.Company, { foreignKey: "id" }); // Company.id = Account.id
db.Company.belongsTo(db.Account, { foreignKey: "id" });

db.Account.hasOne(db.Company, { foreignKey: "companyId" });
db.Company.belongsTo(db.Account, { foreignKey: "companyId" });

db.Account.hasOne(db.Customer, { foreignKey: "customerId" });
db.Customer.belongsTo(db.Account, { foreignKey: "customerId" });

db.Account.hasOne(db.Customer, { foreignKey: "id" }); // Customer.id = Account.id
db.Customer.belongsTo(db.Account, { foreignKey: "id" });

// Company relationships
db.Company.hasOne(db.AboutUs, { foreignKey: "companyId" });
db.AboutUs.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.Post, { foreignKey: "companyId" });
db.Post.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.Complaint, { foreignKey: "companyId" });
db.Complaint.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.Transaction, { foreignKey: "companyId" });
db.Transaction.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasOne(db.SocialMedia, { foreignKey: "companyId" });
db.SocialMedia.belongsTo(db.Company, { foreignKey: "companyId" });

db.Company.hasMany(db.VerificationCode, { foreignKey: "companyId" });
db.VerificationCode.belongsTo(db.Company, { foreignKey: "companyId" });

// Post relationships
db.Post.hasMany(db.PostImage, { foreignKey: "postId" });
db.PostImage.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasOne(db.Villa, { foreignKey: "postId" });
db.Villa.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasOne(db.CommercialStore, { foreignKey: "postId" });
db.CommercialStore.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasOne(db.House, { foreignKey: "postId" });
db.House.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasMany(db.Reservation, { foreignKey: "postId" });
db.Reservation.belongsTo(db.Post, { foreignKey: "postId" });

db.Post.hasMany(db.Favorite, { foreignKey: "postId" });
db.Favorite.belongsTo(db.Post, { foreignKey: "postId" });

// Customer relationships
db.Customer.hasMany(db.Reservation, { foreignKey: "customerId" });
db.Reservation.belongsTo(db.Customer, { foreignKey: "customerId" });

db.Customer.hasMany(db.Complaint, { foreignKey: "customerId" });
db.Complaint.belongsTo(db.Customer, { foreignKey: "customerId" });

db.Customer.hasMany(db.Favorite, { foreignKey: "customerId" });
db.Favorite.belongsTo(db.Customer, { foreignKey: "customerId" });

db.Customer.hasMany(db.Transaction, { foreignKey: "customerId" });
db.Transaction.belongsTo(db.Customer, { foreignKey: "customerId" });

// Reservation relationships
db.Reservation.hasMany(db.Transaction, { foreignKey: "reservationId" });
db.Transaction.belongsTo(db.Reservation, { foreignKey: "reservationId" });

// Advertisement relationships (admin now via Account with role 'admin')
db.Account.hasMany(db.ExternalAd, { foreignKey: "adminId", constraints: false });
db.ExternalAd.belongsTo(db.Account, { foreignKey: "adminId", constraints: false });

module.exports = db;