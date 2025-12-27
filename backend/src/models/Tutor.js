import mongoose from 'mongoose';

/*
  Tutor Model
  --------------------------------
  Purpose:
  - Extends User into Tutor
  - Stores professional tutoring data only
  - Works with uploads (certificates & documents)
  - Supports admin approval & ratings
*/

const tutorSchema = new mongoose.Schema(
  {
    /* ======================
       USER RELATION
    ====================== */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },

    /* ======================
       BASIC PROFILE
    ====================== */
    bio: {
      type: String,
      maxlength: 1000,
      default: ''
    },

    /* ======================
       SUBJECTS & PRICING
    ====================== */
    subjects: [
      {
        name: {
          type: String,
          required: true,
          enum: [
            'Mathematics',
            'Physics',
            'Chemistry',
            'Biology',
            'English',
            'Amharic',
            'History',
            'Geography',
            'Computer Science',
            'Economics',
            'Accounting'
          ]
        },

        gradeLevels: [
          {
            type: String,
            enum: ['1-4', '5-8', '9-10', '11-12', 'university', 'adult']
          }
        ],

        yearsOfExperience: {
          type: Number,
          min: 0,
          max: 50,
          default: 0
        },

        hourlyRate: {
          type: Number,
          required: true,
          min: 50,
          max: 1000
        },

        description: {
          type: String,
          maxlength: 500
        }
      }
    ],

    /* ======================
       EDUCATION
    ====================== */
    education: [
      {
        institution: {
          type: String,
          required: true,
          trim: true
        },

        degree: {
          type: String,
          required: true,
          trim: true
        },

        fieldOfStudy: {
          type: String,
          trim: true
        },

        graduationYear: {
          type: Number,
          min: 1900,
          max: new Date().getFullYear() + 5
        },

        certificateFile: {
          type: String // URL
        }
      }
    ],

    /* ======================
       EXPERIENCE SUMMARY
    ====================== */
    experience: {
      totalYears: {
        type: Number,
        min: 0,
        max: 50,
        default: 0
      },

      description: {
        type: String,
        maxlength: 1000
      }
    },

    /* ======================
       CERTIFICATIONS (UPLOAD)
    ====================== */
    certifications: [
      {
        name: {
          type: String,
          required: true
        },

        issuingOrganization: {
          type: String,
          required: true
        },

        issueDate: {
          type: Date,
          required: true
        },

        certificateFile: {
          url: String,
          filename: String,
          originalName: String,
          size: Number,
          mimetype: String,
          uploadedAt: {
            type: Date,
            default: Date.now
          }
        }
      }
    ],

    /* ======================
       VERIFICATION DOCUMENTS
    ====================== */
    verificationDocuments: [
      {
        documentType: {
          type: String,
          required: true
        },

        file: {
          url: String,
          filename: String,
          originalName: String,
          size: Number,
          mimetype: String
        },

        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending'
        },

        uploadedAt: {
          type: Date,
          default: Date.now
        },

        reviewedAt: Date,

        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },

        rejectionReason: String
      }
    ],

    /* ======================
       AVAILABILITY
    ====================== */
    availability: [
      {
        day: {
          type: String,
          enum: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
          ],
          required: true
        },

        slots: [
          {
            startTime: {
              type: String,
              required: true
            },

            endTime: {
              type: String,
              required: true
            },

            isBooked: {
              type: Boolean,
              default: false
            }
          }
        ]
      }
    ],

    /* ======================
       ADMIN APPROVAL
    ====================== */
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },

    rejectionReason: {
      type: String,
      maxlength: 500
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    approvedAt: Date,

    /* ======================
       RATINGS & STATS
    ====================== */
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
      },

      totalReviews: {
        type: Number,
        default: 0
      }
    },

    totalSessions: {
      type: Number,
      default: 0
    },

    totalHours: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

/* ======================
   INDEXES
====================== */
tutorSchema.index({
  'subjects.name': 'text',
  bio: 'text',
  'education.institution': 'text'
});

/* ======================
   INSTANCE METHODS
====================== */
tutorSchema.methods.isApproved = function () {
  return this.status === 'approved';
};

tutorSchema.methods.updateRating = function (newRating) {
  const totalScore =
    this.rating.average * this.rating.totalReviews + newRating;

  this.rating.totalReviews += 1;
  this.rating.average = totalScore / this.rating.totalReviews;
};

/* ======================
   EXPORT MODEL
====================== */
export default mongoose.model('Tutor', tutorSchema);
