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
        hooks: true,
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
      hooks: {
        afterCreate: async (eventMember, options) => {
          const event = await eventMember.getEvent();
          await event.increment("numAttending");
          // console.log(`Incremented numAttending for Event ${event.id}`);
        },
        afterDestroy: async (eventMember, options) => {
          const event = await eventMember.getEvent();
          await event.decrement("numAttending");
          // console.log(`Decremented numAttending for Event ${event.id}`);
        },
      },
    }
  );
  return Event_Member;
};
