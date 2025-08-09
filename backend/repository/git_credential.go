package repository

import (
	"xsha-backend/database"

	"gorm.io/gorm"
)

type gitCredentialRepository struct {
	db *gorm.DB
}

func NewGitCredentialRepository(db *gorm.DB) GitCredentialRepository {
	return &gitCredentialRepository{db: db}
}

func (r *gitCredentialRepository) Create(credential *database.GitCredential) error {
	return r.db.Create(credential).Error
}

func (r *gitCredentialRepository) GetByID(id uint) (*database.GitCredential, error) {
	var credential database.GitCredential
	err := r.db.Where("id = ?", id).First(&credential).Error
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func (r *gitCredentialRepository) GetByName(name string) (*database.GitCredential, error) {
	var credential database.GitCredential
	err := r.db.Where("name = ?", name).First(&credential).Error
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func (r *gitCredentialRepository) List(name *string, credType *database.GitCredentialType, page, pageSize int) ([]database.GitCredential, int64, error) {
	var credentials []database.GitCredential
	var total int64

	query := r.db.Model(&database.GitCredential{})

	if name != nil && *name != "" {
		query = query.Where("name LIKE ?", "%"+*name+"%")
	}

	if credType != nil {
		query = query.Where("type = ?", *credType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&credentials).Error; err != nil {
		return nil, 0, err
	}

	return credentials, total, nil
}

func (r *gitCredentialRepository) Update(credential *database.GitCredential) error {
	return r.db.Save(credential).Error
}

func (r *gitCredentialRepository) Delete(id uint) error {
	return r.db.Where("id = ?", id).Delete(&database.GitCredential{}).Error
}
