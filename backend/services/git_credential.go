package services

import (
	"errors"
	"fmt"
	"strings"
	"xsha-backend/config"
	"xsha-backend/database"
	"xsha-backend/repository"
	"xsha-backend/utils"
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
		return nil, errors.New("credential name already exists")
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
			encrypted, err := utils.EncryptAES(password, s.config.AESKey)
			if err != nil {
				return nil, fmt.Errorf("failed to encrypt password: %v", err)
			}
			credential.PasswordHash = encrypted
		}
	case database.GitCredentialTypeSSHKey:
		if privateKey, ok := secretData["private_key"]; ok {
			encrypted, err := utils.EncryptAES(privateKey, s.config.AESKey)
			if err != nil {
				return nil, fmt.Errorf("failed to encrypt private key: %v", err)
			}
			credential.PrivateKey = encrypted
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

func (s *gitCredentialService) ListCredentials(credType *database.GitCredentialType, page, pageSize int) ([]database.GitCredential, int64, error) {
	return s.repo.List(credType, page, pageSize)
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
				encrypted, err := utils.EncryptAES(password, s.config.AESKey)
				if err != nil {
					return fmt.Errorf("failed to encrypt password: %v", err)
				}
				credential.PasswordHash = encrypted
			}
		case database.GitCredentialTypeSSHKey:
			if privateKey, ok := secretData["private_key"]; ok {
				encrypted, err := utils.EncryptAES(privateKey, s.config.AESKey)
				if err != nil {
					return fmt.Errorf("failed to encrypt private key: %v", err)
				}
				credential.PrivateKey = encrypted
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
			return errors.New("git_credential.delete_used_by_projects")
		}
	}

	return s.repo.Delete(id)
}

func (s *gitCredentialService) ListActiveCredentials(credType *database.GitCredentialType) ([]database.GitCredential, error) {
	credentials, _, err := s.repo.List(credType, 1, 1000)
	return credentials, err
}

func (s *gitCredentialService) DecryptCredentialSecret(credential *database.GitCredential, secretType string) (string, error) {
	switch secretType {
	case "password", "token":
		if credential.PasswordHash == "" {
			return "", errors.New("password not set")
		}
		return utils.DecryptAES(credential.PasswordHash, s.config.AESKey)
	case "private_key":
		if credential.PrivateKey == "" {
			return "", errors.New("private key not set")
		}
		return utils.DecryptAES(credential.PrivateKey, s.config.AESKey)
	default:
		return "", errors.New("unsupported secret type")
	}
}

func (s *gitCredentialService) ValidateCredentialData(credType string, data map[string]string) error {
	switch database.GitCredentialType(credType) {
	case database.GitCredentialTypePassword:
		if data["password"] == "" {
			return errors.New("password is required for password type")
		}
	case database.GitCredentialTypeToken:
		if data["password"] == "" {
			return errors.New("token is required for token type")
		}
	case database.GitCredentialTypeSSHKey:
		if data["private_key"] == "" {
			return errors.New("private key is required for SSH key type")
		}
		if !strings.Contains(data["private_key"], "BEGIN") {
			return errors.New("invalid private key format")
		}
	default:
		return errors.New("unsupported credential type")
	}
	return nil
}
