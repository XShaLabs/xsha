package services

import (
	"xsha-backend/database"
	"xsha-backend/repository"
)

type dashboardService struct {
	dashboardRepo repository.DashboardRepository
}

func NewDashboardService(dashboardRepo repository.DashboardRepository) DashboardService {
	return &dashboardService{
		dashboardRepo: dashboardRepo,
	}
}

func (s *dashboardService) GetDashboardStats() (map[string]interface{}, error) {
	return s.dashboardRepo.GetDashboardStats()
}

func (s *dashboardService) GetRecentTasks(limit int) ([]database.Task, error) {
	return s.dashboardRepo.GetRecentTasks(limit)
}
