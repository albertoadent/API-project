"use strict";
const { Model } = require("sequelize");
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
      });

      //relationships to Venue
      Event.belongsTo(models.Venue, {
        foreignKey: "venueId",
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
      });

      Event.belongsToMany(models.Image, {
        through: models.Event_Image,
        foreignKey: "eventId",
      });
    }
  }
  Event.init(
    {
      groupId: { type: DataTypes.INTEGER, allowNull: false },
      venueId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      startDate: { type: DataTypes.DATE, allowNull: false },
      endDate: { type: DataTypes.DATE, allowNull: false },
      previewImage: { type: DataTypes.STRING, allowNull: true },
    },
    {
      sequelize,
      modelName: "Event",
    }
  );
  return Event;
};
