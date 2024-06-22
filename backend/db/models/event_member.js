"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Event_Member extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Event_Member.belongsTo(models.Event, {
        foreignKey: "eventId",
        onDelete: "CASCADE",
      });
      Event_Member.belongsTo(models.Group_Member, {
        foreignKey: "groupMemberId",
        onDelete: "CASCADE",
      });
    }
  }
  Event_Member.init(
    {
      groupMemberId: { type: DataTypes.INTEGER, allowNull: false },
      eventId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "Event_Member",
    }
  );
  return Event_Member;
};
