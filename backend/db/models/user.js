"use strict";
const { Model, Validator } = require("sequelize");
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

    async getMemberships(){
      return sequelize.models.Group_Member.findAll({
        where:{
          userId:this.id,
          role:'member'
        }
      })
    }
    async getOrganizerships(){
      return sequelize.models.Group_Member.findAll({
        where:{
          userId:this.id,
          role:'organizer'
        }
      })
    }
    async getCoHostships(){
      return sequelize.models.Group_Member.findAll({
        where:{
          userId:this.id,
          role:'co-host'
        }
      })
    }
    async getPendingships(){
      return sequelize.models.Group_Member.findAll({
        where:{
          userId:this.id,
          role:'pending'
        }
      })
    }

    static associate(models) {
      User.hasMany(models.Group, {
        foreignKey: "organizerId",
        onDelete: "CASCADE",
        hooks: true,
      });
      User.hasMany(models.Group_Member, {
        foreignKey: "userId",
        onDelete: "CASCADE",
        hooks: true,
      });
      User.belongsToMany(models.Group, {
        through: models.Group_Member,
        foreignKey: "userId",
        onDelete: "CASCADE",
      });

      User.belongsToMany(models.Event, {
        through: models.Event_Member,
        foreignKey: "groupMemberId",
        otherKey: "eventId",
        onDelete: "CASCADE",
      });
    }
  }
  User.init(
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          len: [4, 30],
          isNotEmail(value) {
            if (Validator.isEmail(value)) {
              throw new Error("Cannot be an email.");
            }
          },
        },
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
          notNull: {
            args: true,
            msg: "First Name is required",
          },
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 50],
          notNull: {
            args: true,
            msg: "Last Name is required",
          },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 255],
          isEmail: {
            args: true,
            msg: "Invalid email",
          },
        },
      },
      hashedPassword: {
        type: DataTypes.STRING.BINARY,
        allowNull: false,
        validate: {
          len: [60, 60],
        },
      },
    },
    {
      sequelize,
      modelName: "User",
      defaultScope: {
        attributes: {
          exclude: ["hashedPassword", "email", "createdAt", "updatedAt"],
        },
      },
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

  return User;
};
