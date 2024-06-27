"use strict";
const { Model } = require("sequelize");
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class Venue extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Venue.belongsTo(models.Group, {
        foreignKey: "groupId",
      });
      Venue.hasMany(models.Event, {
        foreignKey: "venueId",
        onDelete: "SET NULL",
        hooks: true,
      });
    }
  }
  Venue.init(
    {
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.Group,
        },
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            args: true,
            msg: "Street address is required",
          },
          notNull: {
            args: true,
            msg: "Street address is required",
          },
        },
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            args: true,
            msg: "City is required",
          },
          notNull: {
            args: true,
            msg: "City is required",
          },
        },
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            args: true,
            msg: "State is required",
          },
          notNull: {
            args: true,
            msg: "State is required",
          },
        },
      },
      lat: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        validate: {
          min: {
            args: -90.0,
            msg: "latitude cannot be less than -90",
          },
          max: {
            args: 90.0,
            msg: "latitude cannot be greater than 90",
          },
        },
      },
      lng: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        validate: {
          min: {
            args: -180.0,
            msg: "longitute cannot be less than -180",
          },
          max: {
            args: 180.0,
            msg: "longitute cannot be greater than 180",
          },
        },
        
      },
    },
    {
      sequelize,
      modelName: "Venue",
      getterMethods: {
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
  return Venue;
};
