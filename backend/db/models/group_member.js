"use strict";

const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Group_Member extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Group_Member.belongsTo(models.User, {
        foreignKey: "userId",
        onDelete: "CASCADE",
      });
      Group_Member.belongsTo(models.Group, {
        foreignKey: "groupId",
        onDelete: "CASCADE",
      });
      Group_Member.hasMany(models.Event_Member, {
        foreignKey: "groupMemberId",
        onDelete: "CASCADE",
        hooks: true,
      });
    }
  }
  Group_Member.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.User,
        },
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.Group,
        },
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isRole(role) {
            const validRoles = ["organizer", "co-host", "member", "pending"];
            if (!validRoles.includes(role)) {
              throw new Error("not a valid role for group member");
            }
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Group_Member",
    }
  );
  return Group_Member;
};
