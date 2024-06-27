"use strict";
const { Model } = require("sequelize");
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class Image extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Image.hasMany(models.Event_Image, {
        foreignKey: "imageId",
        onDelete: "CASCADE",
        hooks: true,
      });
      Image.hasMany(models.Group_Image, {
        foreignKey: "imageId",
        onDelete: "CASCADE",
        hooks: true,
      });

      Image.belongsToMany(models.Group, {
        through: models.Group_Image,
        foreignKey: "imageId",
        onDelete:"CASCADE"
      });
      Image.belongsToMany(models.Event, {
        through: models.Event_Image,
        foreignKey: "imageId",
        onDelete:"CASCADE"
      });
    }
  }
  Image.init(
    {
      url: { type: DataTypes.STRING, allowNull: false },
      preview: { type: DataTypes.BOOLEAN, allowNull: false },
    },
    {
      sequelize,
      modelName: "Image",
      getters: {
        createdAt() {
          const rawValue = this.getDataValue('createdAt');
          return moment(rawValue).format('YYYY-MM-DD HH:mm:ss');
        },
        updatedAt() {
          const rawValue = this.getDataValue('updatedAt');
          return moment(rawValue).format('YYYY-MM-DD HH:mm:ss');
        }
      }
    }
  );
  return Image;
};
