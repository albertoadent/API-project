"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      //User Relationships
      Group.belongsTo(models.User, {
        foreignKey: "organizerId",
        onDelete:"CASCADE"
      });
      Group.belongsToMany(models.User, {
        through: models.Group_Member,
        foreignKey: "groupId",
        onDelete:"CASCADE"
      });

      //Venue Relationships
      Group.hasMany(models.Venue, {
        foreignKey: "groupId",
        onDelete: "CASCADE",
        hooks: true,
      });

      //Event Relationships
      Group.hasMany(models.Event, {
        foreignKey: "venueId",
        onDelete: "CASCADE",
        hooks: true,
      });

      //Group_member Relationships
      Group.hasMany(models.Group_Member, {
        foreignKey: "groupId",
        onDelete: "CASCADE",
        hooks: true,
      });

      Group.belongsToMany(models.Image, {
        through: models.Group_Image,
        foreignKey: "groupId",
        onDelete:"CASCADE"
      });
    }
  }
  Group.init(
    {
      organizerId: { type: DataTypes.INTEGER, allowNull: false },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: {
            args: [1, 60],
            msg: "Name must be 60 charactters or less",
          },
        },
      },
      about: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [50, 255],
            msg: "About must be 50 characters or more",
          },
        },
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isGoodType(type) {
            const validTypes = ["Online", "In person"];
            if (!validTypes.includes(type))
              throw new Error(`Type must be 'Online' or 'In person'`);
          },
        },
      },
      private: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        validate: {
          isBoolean(value) {
            if (typeof value !== "boolean") {
              throw new Error("Private must be a boolean");
            }
          },
        },
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
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
          notNull: {
            args: true,
            msg: "State is required",
          },
        },
      },
      numMembers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      previewImage: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      modelName: "Group",
    }
  );
  return Group;
};
