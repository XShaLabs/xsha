package services

import (
	"xsha-backend/database"
	"xsha-backend/repository"
)

type loginLogService struct {
	repo repository.LoginLogRepository
}

func NewLoginLogService(repo repository.LoginLogRepository) LoginLogService {
	return &loginLogService{repo: repo}
}

func (s *loginLogService) GetLogs(username, ip *string, success *bool, startTime, endTime *string, page, pageSize int) ([]database.LoginLog, int64, error) {
	return s.repo.GetLogs(username, ip, success, startTime, endTime, page, pageSize)
}

func (s *loginLogService) CleanOldLogs(days int) error {
	return s.repo.CleanOld(days)
}
