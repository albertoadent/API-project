"use strict";
const { Model } = require("sequelize");
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class Group_Image extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Group_Image.init(
    {
      imageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.Image,
        },
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.Group,
        },
      },
    },
    {
      sequelize,
      modelName: "Group_Image",
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
    },
    
  );
  return Group_Image;
};
