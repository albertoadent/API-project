"use strict";
const { Model } = require("sequelize");
const { validateValidId } = require("../../utils/validation");
module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      //relationships to Group
      Event.belongsTo(models.Group, {
        foreignKey: "groupId",
        onDelete: "CASCADE",
      });

      //relationships to Venue
      Event.belongsTo(models.Venue, {
        foreignKey: "venueId",
        onDelete: "CASCADE",
      });

      //relationships to join tables
      Event.hasMany(models.Event_Image, {
        foreignKey: "eventId",
        onDelete: "CASCADE",
        hooks: true,
      });
      Event.hasMany(models.Event_Member, {
        foreignKey: "eventId",
        onDelete: "CASCADE",
        hooks: true,
      });
      Event.belongsToMany(models.User, {
        through: models.Event_Member,
        foreignKey: "eventId",
        otherKey: "groupMemberId",
        onDelete: "CASCADE",
      });
      Event.belongsToMany(models.Image, {
        through: models.Event_Image,
        foreignKey: "eventId",
        onDelete: "CASCADE",
      });
    }
  }
  Event.init(
    {
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isValidId: validateValidId("Group"),
        },
        references: {
          model: sequelize.models.Group,
        },
      },
      venueId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isValidId: validateValidId("Venue"),
        },
        references:{
          model:sequelize.models.Venue
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: {
            args: [5, 255],
            msg: "Name must be at least 5 characters",
          },
        },
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isValidType(type) {
            const allowedTypes = ["Online", "In person"];
            if (!allowedTypes.includes(type)) {
              throw new Error("Type must be Online or In person");
            }
          },
        },
      },
      price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        validate: {
          isDecimal: {
            args: true,
            msg: "Price is invalid",
          },
          min: 0,
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "none",
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isInFuture(value) {
            if (new Date(value) <= new Date()) {
              throw new Error("Start date must be in the future");
            }
          }
        },
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isAfterStart(date) {
            const endDate = new Date(date);
            const startDate = new Date(this.startDate);
            if (endDate < startDate) {
              throw new Error("End date is less than start date");
            }
          },
        },
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          isInt: {
            args: true,
            msg: "Capacity must be an integer",
          },
          minNumAttending(value) {
            if (this.numAttending && value < this.numAttending) {
              throw new Error(
                "The capacity cannot be less than the number of people attending"
              );
            }
          },
          min: 0,
        },
      },
      numAttending: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          maxCapacity(value) {
            if (this.capacity && value > this.capacity) {
              throw new Error(
                "The number of people attending cannot be greater than the capacity"
              );
            }
          },
          min: 0,
        },
      },
      previewImage: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      modelName: "Event",
      defaultScope: {
        attributes: { exclude: ["createdAt", "updatedAt", "capacity"] },
      },
      scopes: {
        default: {
          attributes: { exclude: ["createdAt", "updatedAt", "capacity"] },
        },
      },
    }
  );
  return Event;
};
