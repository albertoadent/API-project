"use strict";
const { Model } = require("sequelize");
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */

    async getMembers() {
      return this.getGroup_Members({
        where: {
          role: "member",
        },
      });
    }
    async getOrganizer(options) {
      return sequelize.models.User.findByPk(this.organizerId, options);
    }
    async getCoHosts() {
      return this.getGroup_Members({
        where: {
          role: "co-host",
        },
      });
    }
    async getPendings() {
      return this.getGroup_Members({
        where: {
          role: "pending",
        },
      });
    }

    static associate(models) {
      //User Relationships
      Group.belongsTo(models.User, {
        foreignKey: "organizerId",
      });
      Group.belongsToMany(models.User, {
        through: models.Group_Member,
        foreignKey: "groupId",
        onDelete: "CASCADE",
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
        onDelete: "CASCADE",
      });
    }
  }
  Group.init(
    {
      organizerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: sequelize.models.User,
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: {
            args: [1, 60],
            msg: "Name must be 60 characters or less",
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
    },
    {
      sequelize,
      modelName: "Group",
      hooks: {
        async afterCreate(group, options) {
          await sequelize.models.Group_Member.create({
            groupId: group.id,
            userId: group.organizerId,
            role: "organizer",
          });
        },
        async beforeCreate(group, options) {
          if (group.previewImage && typeof group.previewImage === 'string') {
            const image = await sequelize.models.Image.create({
              url: group.previewImage,
              preview: true,
            });
            await sequelize.models.Group_Image.create({
              imageId: image.id,
              groupId: group.id,
            });
          }
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
  return Group;
};
