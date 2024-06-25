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
      });
      Event_Member.belongsTo(models.Group_Member, {
        foreignKey: "groupMemberId",
      });
    }
  }
  Event_Member.init(
    {
      groupMemberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.Group_Member,
        },
      },
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.Event,
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isValidSatuts(status) {
            const validStatus = ["attending", "waitlist", "pending"];
            if (!validStatus.includes(status)) {
              throw new Error("not a valid status");
            }
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Event_Member",
      defaultScope: ["groupMemberId", "eventId", "status", "id"],
      hooks: {
        afterCreate: async (eventMember, options) => {
          const event = await eventMember.getEvent();
          await event.increment("numAttending");
          // console.log(`Incremented numAttending for Event ${event.id}`);
        },
      },
    }
  );
  return Event_Member;
};
