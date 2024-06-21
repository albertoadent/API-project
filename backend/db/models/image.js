"use strict";
const { Model } = require("sequelize");
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
      });
      Image.belongsToMany(models.Event, {
        through: models.Event_Image,
        foreignKey: "imageId",
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
    }
  );
  return Image;
};
