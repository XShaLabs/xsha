package services

import (
	"fmt"
	"strings"
	"xsha-backend/config"
	"xsha-backend/database"
	appErrors "xsha-backend/errors"
	"xsha-backend/repository"
)

type gitCredentialService struct {
	repo        repository.GitCredentialRepository
	projectRepo repository.ProjectRepository
	config      *config.Config
}

func NewGitCredentialService(repo repository.GitCredentialRepository, projectRepo repository.ProjectRepository, cfg *config.Config) GitCredentialService {
	return &gitCredentialService{
		repo:        repo,
		projectRepo: projectRepo,
		config:      cfg,
	}
}

func (s *gitCredentialService) CreateCredential(name, description, credType, username string, secretData map[string]string, createdBy string) (*database.GitCredential, error) {
	if err := s.ValidateCredentialData(credType, secretData); err != nil {
		return nil, err
	}

	if existing, _ := s.repo.GetByName(name); existing != nil {
		return nil, appErrors.ErrCredentialNameExists
	}

	credential := &database.GitCredential{
		Name:        name,
		Description: description,
		Type:        database.GitCredentialType(credType),
		Username:    username,
		CreatedBy:   createdBy,
	}

	switch database.GitCredentialType(credType) {
	case database.GitCredentialTypePassword, database.GitCredentialTypeToken:
		if password, ok := secretData["password"]; ok {
			credential.PasswordHash = password
		}
	case database.GitCredentialTypeSSHKey:
		if privateKey, ok := secretData["private_key"]; ok {
			credential.PrivateKey = privateKey
		}
		if publicKey, ok := secretData["public_key"]; ok {
			credential.PublicKey = publicKey
		}
	}

	if err := s.repo.Create(credential); err != nil {
		return nil, err
	}

	return credential, nil
}

func (s *gitCredentialService) GetCredential(id uint) (*database.GitCredential, error) {
	return s.repo.GetByID(id)
}

func (s *gitCredentialService) ListCredentials(name *string, credType *database.GitCredentialType, page, pageSize int) ([]database.GitCredential, int64, error) {
	return s.repo.List(name, credType, page, pageSize)
}

func (s *gitCredentialService) UpdateCredential(id uint, updates map[string]interface{}, secretData map[string]string) error {
	credential, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	if name, ok := updates["name"]; ok {
		credential.Name = name.(string)
	}
	if description, ok := updates["description"]; ok {
		credential.Description = description.(string)
	}
	if username, ok := updates["username"]; ok {
		credential.Username = username.(string)
	}

	if len(secretData) > 0 {
		switch credential.Type {
		case database.GitCredentialTypePassword, database.GitCredentialTypeToken:
			if password, ok := secretData["password"]; ok {
				credential.PasswordHash = password
			}
		case database.GitCredentialTypeSSHKey:
			if privateKey, ok := secretData["private_key"]; ok {
				credential.PrivateKey = privateKey
			}
			if publicKey, ok := secretData["public_key"]; ok {
				credential.PublicKey = publicKey
			}
		}
	}

	return s.repo.Update(credential)
}

func (s *gitCredentialService) DeleteCredential(id uint) error {
	credential, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}

	projects, _, err := s.projectRepo.List("", nil, 1, 1000)
	if err != nil {
		return fmt.Errorf("failed to check credential usage: %v", err)
	}

	for _, project := range projects {
		if project.CredentialID != nil && *project.CredentialID == credential.ID {
			return appErrors.ErrCredentialUsedByProjects
		}
	}

	return s.repo.Delete(id)
}

func (s *gitCredentialService) ListActiveCredentials(credType *database.GitCredentialType) ([]database.GitCredential, error) {
	credentials, _, err := s.repo.List(nil, credType, 1, 1000)
	return credentials, err
}

func (s *gitCredentialService) DecryptCredentialSecret(credential *database.GitCredential, secretType string) (string, error) {
	switch secretType {
	case "password", "token":
		if credential.PasswordHash == "" {
			return "", appErrors.ErrCredentialPasswordNotSet
		}
		return credential.PasswordHash, nil
	case "private_key":
		if credential.PrivateKey == "" {
			return "", appErrors.ErrCredentialPrivateKeyNotSet
		}
		return credential.PrivateKey, nil
	default:
		return "", appErrors.ErrCredentialUnsupportedSecretType
	}
}

func (s *gitCredentialService) ValidateCredentialData(credType string, data map[string]string) error {
	switch database.GitCredentialType(credType) {
	case database.GitCredentialTypePassword:
		if data["password"] == "" {
			return appErrors.ErrCredentialPasswordRequired
		}
	case database.GitCredentialTypeToken:
		if data["password"] == "" {
			return appErrors.ErrCredentialTokenRequired
		}
	case database.GitCredentialTypeSSHKey:
		if data["private_key"] == "" {
			return appErrors.ErrCredentialPrivateKeyRequired
		}
		if !strings.Contains(data["private_key"], "BEGIN") {
			return appErrors.ErrCredentialInvalidPrivateKeyFormat
		}
	default:
		return appErrors.ErrCredentialUnsupportedType
	}
	return nil
}
